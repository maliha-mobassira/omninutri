# app/services/intent.py

def detect_intent(message: str | None):
    t = (message or "").strip().lower()

    # Swagger often sends "string"
    if t == "string":
        t = ""

    want_recipe = any(k in t for k in ["recipe", "how to make", "ingredients", "smoothie", "shake"])
    want_suggestions = any(k in t for k in ["suggest", "recommend", "what should i eat", "next meal", "options", "plan"])

    # meal logging (text food input)
    is_food_log = any(k in t for k in ["i ate", "i had", "for breakfast", "for lunch", "for dinner", "snack", "today i ate"])

    # coaching questions -> Brain only
    is_coaching = any(k in t for k in ["bmi", "calorie", "target", "water", "protein", "how much", "progress"])

    return {
        "text": t,
        "want_recipe": want_recipe,
        "want_suggestions": want_suggestions,
        "is_food_log": is_food_log,
        "is_coaching": is_coaching,
    }