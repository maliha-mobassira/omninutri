import os
import requests
from dotenv import load_dotenv

load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY")


def call_groq(prompt: str, model: str = "llama-3.3-70b-versatile") -> str:
    if not GROQ_API_KEY:
        raise ValueError("GROQ_API_KEY is missing in .env")

    url = "https://api.groq.com/openai/v1/chat/completions"

    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json"
    }

    payload = {
        "model": model,
        "messages": [
            {
                "role": "system",
                "content": (
                    "You are a precise nutrition, recipe, and meal recommendation assistant. "
                    "Return clean outputs exactly in the format requested."
                )
            },
            {
                "role": "user",
                "content": prompt
            }
        ],
        "temperature": 0.2
    }

    response = requests.post(url, headers=headers, json=payload, timeout=45)
    response.raise_for_status()

    data = response.json()
    return data["choices"][0]["message"]["content"]