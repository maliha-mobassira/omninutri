import os
import json
import requests
from dotenv import load_dotenv

from app.services.rag import query_rag  # ✅ RAG integrated

load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.1-8b-instant")
GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"


def _fallback(user_text: str):
    t = (user_text or "").lower()

    if "burger" in t:
        food, kcal = "Burger", 550
    elif "pizza" in t:
        food, kcal = "Pizza slice", 380
    elif "biryani" in t:
        food, kcal = "Chicken biryani", 650
    elif "salad" in t:
        food, kcal = "Salad", 180
    else:
        food, kcal = "Meal (estimate)", 450

    return {
        "nutrition": {
            "food_name": food,
            "estimated_quantity": "1 serving",
            "calories": kcal,
            "protein": 20,
            "fat": 18,
            "carbohydrates": 55,
            "fiber": 6,
            "confidence": 0.45,
        },
        "recipe": None,
        "suggestions": [],
    }


def analyze_meal_text(user_text: str, goal: str, budget: str,
                      want_recipe: bool, want_suggestions: bool) -> dict:

    if not GROQ_API_KEY:
        return _fallback(user_text)

    # ✅ Query RAG
    try:
        rag_docs = query_rag(user_text)
        rag_context = "\n".join(rag_docs) if rag_docs else ""
    except Exception:
        rag_context = ""

    system = f"""
You are Finder for OmniNutri (South Asian nutrition + recipes + budget options).

Use the following knowledge base context if relevant:

{rag_context}

Return ONLY valid JSON. No markdown.

Schema:
{{
  "nutrition": {{
    "food_name": "",
    "estimated_quantity": "",
    "calories": 0,
    "protein": 0,
    "fat": 0,
    "carbohydrates": 0,
    "fiber": 0,
    "confidence": 0.0
  }},
  "recipe": null,
  "suggestions": []
}}

Rules:
- Always fill nutrition.
- If want_recipe=false -> recipe=null
- If want_suggestions=false -> suggestions=[]
- Budget: {budget}
- Goal: {goal}

Recipe format if requested:
{{
  "name": "",
  "servings": 1,
  "prep_minutes": 10,
  "ingredients": ["..."],
  "steps": ["..."],
  "tips": ["..."]
}}
"""

    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json"
    }

    payload = {
        "model": GROQ_MODEL,
        "temperature": 0.2,
        "messages": [
            {"role": "system", "content": system},
            {
                "role": "user",
                "content": f"user_text: {user_text}\n"
                           f"want_recipe={want_recipe}\n"
                           f"want_suggestions={want_suggestions}\n"
                           f"Return JSON only."
            },
        ],
    }

    try:
        r = requests.post(GROQ_URL, headers=headers, json=payload, timeout=30)
        data = r.json()

        content = data["choices"][0]["message"]["content"]
        content = content.replace("```json", "").replace("```", "").strip()

        return json.loads(content)

    except Exception:
        return _fallback(user_text)