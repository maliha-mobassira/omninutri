def calculate_bmi(weight, height):
    h_m = height / 100
    return round(weight / (h_m ** 2), 2)

def estimate_tdee(user):
    # simple estimate
    base = 10 * user["weight"] + 6.25 * user["height"] - 5 * user["age"]
    mult = {"low": 1.2, "moderate": 1.55, "high": 1.9}.get(user.get("activity_level"), 1.55)
    return int(base * mult)

def generate_advice(user, nutrition_data=None):
    bmi = calculate_bmi(user["weight"], user["height"])
    tdee = estimate_tdee(user)

    goal = user.get("goal", "maintenance")
    if goal == "weight_loss":
        goal_cals = int(tdee * 0.85)
    elif goal == "weight_gain" or goal == "muscle_gain":
        goal_cals = int(tdee * 1.10)
    else:
        goal_cals = tdee

    protein_target = round(user["weight"] * (1.8 if goal in ["muscle_gain", "weight_gain"] else 1.4), 1)
    water_target_liters = round(max(1.5, min(4.0, (user["weight"] * 35) / 1000)), 2)

    bmi_category = "Normal"
    if bmi < 18.5:
        bmi_category = "Underweight"
    elif bmi >= 25 and bmi < 30:
        bmi_category = "Overweight"
    elif bmi >= 30:
        bmi_category = "High"

    health_profile = {
        "bmi": bmi,
        "bmi_category": bmi_category,
        "daily_calories": tdee,
        "goal_calories": goal_cals,
        "protein_target": protein_target,
        "water_target_liters": water_target_liters,
    }

    if not nutrition_data or not nutrition_data.get("calories"):
        advice = (
            f"Your BMI is {bmi} ({bmi_category}). "
            f"Daily need ~{tdee} kcal. Goal target ~{goal_cals} kcal/day. "
            f"Protein ~{protein_target} g/day. Water ~{water_target_liters} L/day."
        )
        return {"health_profile": health_profile, "advice": advice}

    cals = nutrition_data.get("calories", 0)
    advice = (
        f"You logged ~{cals} kcal. "
        f"Try to stay near your goal target (~{goal_cals} kcal/day). "
        f"For your goal, aim ~{protein_target} g protein/day and ~{water_target_liters} L water/day."
    )

    return {"health_profile": health_profile, "advice": advice}