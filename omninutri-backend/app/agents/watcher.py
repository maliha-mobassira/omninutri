import os
import json
import base64
import re
import requests
from dotenv import load_dotenv

from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
WATCHER_MIN_CONF = float(os.getenv("WATCHER_MIN_CONF", "0.75"))

GEMINI_URL = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent?key={GEMINI_API_KEY}"

_session = requests.Session()
_retries = Retry(
    total=3,
    backoff_factor=0.7,
    status_forcelist=[429, 500, 502, 503, 504],
    allowed_methods=["POST"],
)
_session.mount("https://", HTTPAdapter(max_retries=_retries))


def _default_payload(question: str = None):
    return {
        "food_name": "Analysis temporarily unavailable",
        "estimated_quantity": "N/A",
        "calories": 0,
        "protein": 0,
        "fat": 0,
        "carbohydrates": 0,
        "fiber": 0,
        "confidence": 0.0,
        "needs_clarification": True,
        "alternatives": [
            {"food_name": "Burger", "confidence": 0.2},
            {"food_name": "Biryani", "confidence": 0.2},
            {"food_name": "Salad", "confidence": 0.2},
        ],
        "question": question
        or "I couldn’t read the photo reliably. What is this meal and roughly how much (half plate / 1 plate)?",
    }


def _extract_json(text: str) -> dict:
    cleaned = (text or "").strip().replace("```json", "").replace("```", "").strip()
    try:
        return json.loads(cleaned)
    except Exception:
        m = re.search(r"\{.*\}", cleaned, re.S)
        if not m:
            raise
        return json.loads(m.group(0))


def analyze_food_image(image_bytes: bytes, mime_type: str = "image/jpeg") -> dict:
    if not GEMINI_API_KEY:
        return _default_payload("GEMINI_API_KEY missing in backend .env.")

    if not image_bytes:
        return _default_payload("Empty image received. Please upload again.")

    prompt = """
You are OmniNutri Watcher (food photo analyst).
Return ONLY valid JSON (no markdown).

Schema:
{
  "food_name": "",
  "estimated_quantity": "",
  "calories": 0,
  "protein": 0,
  "fat": 0,
  "carbohydrates": 0,
  "fiber": 0,
  "confidence": 0.0,
  "needs_clarification": false,
  "alternatives": [{"food_name":"", "confidence":0.0}],
  "question": ""
}

Rules:
- If confidence < 0.75 OR the food could be multiple items:
  needs_clarification=true,
  include up to 3 alternatives,
  ask one short question in "question".
- Prefer South Asian + common foods (burger, pizza, salad, biryani, pani puri).
- Estimate portion and nutrition realistically.
"""

    b64 = base64.b64encode(image_bytes).decode("utf-8")

    payload = {
        "contents": [
            {
                "role": "user",
                "parts": [
                    {"text": prompt},
                    {"inlineData": {"mimeType": mime_type, "data": b64}},
                ],
            }
        ],
        "generationConfig": {
            "temperature": 0.2,
            "responseMimeType": "application/json",
        },
    }

    try:
        r = _session.post(GEMINI_URL, json=payload, timeout=60)
        data = r.json()

        if r.status_code != 200:
            out = _default_payload("Watcher failed. Try again.")
            out["error"] = data
            return out

        text = data["candidates"][0]["content"]["parts"][0]["text"]
        parsed = _extract_json(text)

        out = _default_payload()
        out.update(parsed)

        # normalize
        out["confidence"] = float(out.get("confidence") or 0.0)
        if not isinstance(out.get("alternatives"), list):
            out["alternatives"] = []

        # enforce clarification if low confidence
        if out["confidence"] < WATCHER_MIN_CONF:
            out["needs_clarification"] = True
            if not out.get("question"):
                out["question"] = "I’m not fully sure. What is this meal (burger/biryani/salad) and how much?"

        # ensure we always give options when clarifying
        if out.get("needs_clarification") and not out.get("alternatives"):
            out["alternatives"] = [
                {"food_name": out.get("food_name") or "Burger", "confidence": out["confidence"]},
                {"food_name": "Biryani", "confidence": 0.2},
                {"food_name": "Salad", "confidence": 0.2},
            ]

        return out

    except Exception as e:
        out = _default_payload()
        out["error"] = str(e)
        return out