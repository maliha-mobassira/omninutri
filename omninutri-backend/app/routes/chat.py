from fastapi import APIRouter, UploadFile, File, Form
from app.agents.watcher import analyze_food_image
from app.agents.finder import analyze_meal_text
from app.agents.brain import generate_advice

router = APIRouter()

user_profile = {
    "age": 22,
    "height": 170,
    "weight": 65,
    "activity_level": "moderate",
    "goal": "muscle_gain",
    "budget": "medium",
}

def detect_intent(message: str | None) -> dict:
    t = (message or "").strip().lower()
    if t == "string":
        t = ""
    recipe_words = ["recipe", "recepie", "receipe", "recipie", "how to make", "ingredients", "steps", "smoothie", "shake"]
    suggest_words = ["suggest", "recommend", "options", "what should i eat", "meal plan", "budget", "next meal"]
    food_log_words = ["i ate", "i had", "for breakfast", "for lunch", "for dinner", "snack", "today i ate", "it is"]
    coaching_words = ["bmi", "calorie", "target", "water", "protein", "tdee", "progress", "how much left"]
    return {
        "text": t,
        "want_recipe": any(w in t for w in recipe_words),
        "want_suggestions": any(w in t for w in suggest_words),
        "is_food_log": any(w in t for w in food_log_words),
        "is_coaching": any(w in t for w in coaching_words),
    }

def format_message(nutrition: dict, brain_out: dict, finder_out: dict | None = None) -> str:
    advice = brain_out.get("advice", "")
    lines = [
        f"🍽 Food: {nutrition.get('food_name','Unknown')}",
        f"📦 Quantity: {nutrition.get('estimated_quantity','—')}",
        "",
        f"🔥 Calories: {nutrition.get('calories',0)} kcal",
        f"🥩 Protein: {nutrition.get('protein',0)}g | 🍞 Carbs: {nutrition.get('carbohydrates',0)}g | 🧈 Fat: {nutrition.get('fat',0)}g | 🌾 Fiber: {nutrition.get('fiber',0)}g",
        f"🎯 Confidence: {nutrition.get('confidence',0)}",
        "",
        "💡 Advice:",
        advice,
    ]

    if finder_out and finder_out.get("recipe"):
        r = finder_out["recipe"]
        lines += ["", f"📌 Recipe: {r.get('name','Recipe')}"]
        for x in (r.get("ingredients") or [])[:10]:
            lines.append(f"- {x}")

    return "\n".join(lines)

@router.post("/chat")
async def chat(message: str = Form(None), image: UploadFile = File(None)):
    intent = detect_intent(message)

    # IMAGE -> Watcher
    if image is not None and image.filename:
        image_bytes = await image.read()
        nutrition = analyze_food_image(image_bytes, image.content_type or "image/jpeg")

        if nutrition.get("needs_clarification"):
            options = [a.get("food_name") for a in (nutrition.get("alternatives") or []) if a.get("food_name")]
            return {
                "source": "watcher",
                "nutrition": nutrition,
                "message": nutrition.get("question") or "Please confirm the food.",
                "ui": {"type": "clarification", "options": options},
            }

        brain_out = generate_advice(user_profile, nutrition)
        finder_out = None
        if intent["want_recipe"] or intent["want_suggestions"]:
            finder_out = analyze_meal_text(
                user_text=f"Give recipe/suggestions for {nutrition.get('food_name')}",
                goal=user_profile["goal"],
                budget=user_profile["budget"],
                want_recipe=intent["want_recipe"],
                want_suggestions=intent["want_suggestions"],
            )

        return {
            "source": "watcher",
            "nutrition": nutrition,
            "health_profile": brain_out.get("health_profile"),
            "finder": finder_out,
            "message": format_message(nutrition, brain_out, finder_out),
        }

    # TEXT -> Finder or Brain
    if intent["text"]:
        # coaching-only
        if intent["is_coaching"] and not (intent["want_recipe"] or intent["want_suggestions"] or intent["is_food_log"]):
            brain_out = generate_advice(user_profile, None)
            return {"source": "brain", "health_profile": brain_out.get("health_profile"), "message": brain_out.get("advice")}

        finder_out = analyze_meal_text(
            user_text=intent["text"],
            goal=user_profile["goal"],
            budget=user_profile["budget"],
            want_recipe=intent["want_recipe"],
            want_suggestions=intent["want_suggestions"],
        )

        nutrition = (finder_out or {}).get("nutrition") or {}
        brain_out = generate_advice(user_profile, nutrition)

        return {
            "source": "finder",
            "nutrition": nutrition,
            "health_profile": brain_out.get("health_profile"),
            "finder": finder_out,
            "message": format_message(nutrition, brain_out, finder_out),
        }

    return {"message": "Send a message or upload an image."}