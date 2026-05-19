// Supported step types:
// text | number | single_choice | multi_choice | time_range | slider | matrix
export const onboardingSteps = [
  // -------------------------
  // SECTION: Core Profile
  // -------------------------
  { section: "Core Profile" },

  { id: "full_name", icon: "👋", title: "What should we call you?", subtitle: "Optional", type: "text", required: false, dbKey: "full_name", placeholder: "e.g., Ishika" },

  { id: "age", icon: "🎂", title: "Your age", subtitle: "Required", type: "number", required: true, dbKey: "age", min: 10, max: 90 },

  {
    id: "gender", icon: "🧬", title: "Gender", subtitle: "Optional (improves estimate)",
    type: "single_choice", required: false, dbKey: "gender",
    options: [
      { label: "👨 Male", value: "male" },
      { label: "👩 Female", value: "female" },
      { label: "🙈 Prefer not to say", value: "unknown" },
    ],
  },

  { id: "height", icon: "📏", title: "Height (cm)", subtitle: "Required (120–220)", type: "number", required: true, dbKey: "height", min: 120, max: 220 },

  { id: "weight", icon: "⚖️", title: "Weight (kg)", subtitle: "Required (25–250)", type: "number", required: true, dbKey: "weight", min: 25, max: 250 },

  {
    id: "activity_level", icon: "🏃", title: "How active is your typical day?", subtitle: "Required",
    type: "single_choice", required: true, dbKey: "activity_level",
    options: [
      { label: "🪑 Mostly sitting", value: "sedentary" },
      { label: "🚶 Light movement", value: "light" },
      { label: "🏋️ Active", value: "active" },
      { label: "🔥 Very active", value: "very_active" },
    ],
  },

  {
    id: "goal", icon: "🎯", title: "Your goal", subtitle: "Required",
    type: "single_choice", required: true, dbKey: "goal",
    options: [
      { label: "⬇️ Lose weight", value: "weight_loss" },
      { label: "➡️ Maintain", value: "maintenance" },
      { label: "⬆️ Gain weight", value: "weight_gain" },
    ],
  },

  {
    id: "persona", icon: "🧑‍💼", title: "Which persona fits you best?", subtitle: "Required",
    type: "single_choice", required: true, dbKey: "persona",
    options: [
      { label: "🎓 Student", value: "student" },
      { label: "🧱 Laborer", value: "laborer" },
      { label: "💼 Executive", value: "executive" },
      { label: "👴 Senior", value: "senior" },
    ],
  },

  {
    id: "budget", icon: "💸", title: "Budget level", subtitle: "Optional",
    type: "single_choice", required: false, dbKey: "budget",
    options: [
      { label: "🪙 Low", value: "low" },
      { label: "💵 Medium", value: "medium" },
      { label: "💳 High", value: "high" },
    ],
  },

  // -------------------------
  // SECTION: Food & Diet
  // -------------------------
  { section: "Food & Diet" },

  { id: "dietary_preference", icon: "🍛", title: "Food preferences", subtitle: "Optional (spicy, less oil, etc.)", type: "text", required: false, dbKey: "dietary_preference", placeholder: "e.g., spicy, less oil, high protein" },

  {
    id: "dietary_restrictions", icon: "🥗", title: "Dietary restrictions", subtitle: "Optional (select all that apply)",
    type: "multi_choice", required: false, dbKey: "dietary_restrictions", maxSelect: 6, noneValue: "none",
    options: [
      { label: "🥬 Vegetarian", value: "vegetarian" },
      { label: "🌱 Vegan", value: "vegan" },
      { label: "☪️ Halal", value: "halal" },
      { label: "🐄 No beef", value: "no_beef" },
      { label: "🐖 No pork", value: "no_pork" },
      { label: "🥛 Lactose-free", value: "lactose_free" },
      { label: "🌾 Gluten-free", value: "gluten_free" },
      { label: "🧂 Low salt", value: "low_salt" },
      { label: "✅ None", value: "none" },
    ],
  },

  { id: "allergies", icon: "🚫", title: "Allergies", subtitle: "Optional", type: "text", required: false, dbKey: "allergies", placeholder: "e.g., peanuts, milk" },

  {
    id: "eating_out_frequency", icon: "🍽️", title: "Eating out frequency", subtitle: "Optional",
    type: "single_choice", required: false, dbKey: "eating_out_frequency",
    options: [
      { label: "🏠 Mostly home", value: "home_only" },
      { label: "🙂 Sometimes", value: "sometimes" },
      { label: "🍔 Often", value: "often" },
    ],
  },

  // -------------------------
  // SECTION: Routine & Timing
  // -------------------------
  { section: "Routine & Timing" },

  {
    id: "meals_per_day", icon: "🍛", title: "Meals per day", subtitle: "Optional",
    type: "single_choice", required: false, dbKey: "meals_per_day",
    options: [
      { label: "2 meals", value: 2 },
      { label: "3 meals", value: 3 },
      { label: "4 meals", value: 4 },
      { label: "5+ meals", value: 5 },
    ],
  },

  {
    id: "meal_times", icon: "🕒", title: "Meal window", subtitle: "Optional (first & last meal time)",
    type: "time_range", required: false, dbKeys: ["first_meal_time", "last_meal_time"],
  },

  {
    id: "fasting_style", icon: "⏳", title: "Intermittent fasting style", subtitle: "Optional",
    type: "single_choice", required: false, dbKey: "fasting_style",
    options: [
      { label: "No fasting", value: "none" },
      { label: "16:8", value: "16_8" },
      { label: "14:10", value: "14_10" },
      { label: "18:6", value: "18_6" },
    ],
  },

  // -------------------------
  // SECTION: Lifestyle & Health
  // -------------------------
  { section: "Lifestyle & Health" },

  { id: "sleep_hours", icon: "😴", title: "Average sleep", subtitle: "Optional", type: "slider", required: false, dbKey: "sleep_hours", min: 3, max: 10, step: 0.5, unit: "h" },

  {
    id: "stress_level", icon: "🧠", title: "Stress level", subtitle: "Optional",
    type: "single_choice", required: false, dbKey: "stress_level",
    options: [
      { label: "Low", value: "low" },
      { label: "Medium", value: "medium" },
      { label: "High", value: "high" },
    ],
  },

  {
    id: "workout_frequency", icon: "🏋️", title: "Workouts per week", subtitle: "Optional",
    type: "single_choice", required: false, dbKey: "workout_frequency",
    options: [
      { label: "0", value: "0" },
      { label: "1–2", value: "1_2" },
      { label: "3–4", value: "3_4" },
      { label: "5+", value: "5_plus" },
    ],
  },

  {
    id: "health_conditions", icon: "🩺", title: "Health conditions", subtitle: "Optional (select all that apply)",
    type: "multi_choice", required: false, dbKey: "health_conditions", maxSelect: 5, noneValue: "none",
    options: [
      { label: "🍬 Diabetes/prediabetes", value: "diabetes" },
      { label: "🫀 High blood pressure", value: "hypertension" },
      { label: "🧈 High cholesterol", value: "cholesterol" },
      { label: "🦋 Thyroid issues", value: "thyroid" },
      { label: "🧠 Anxiety/stress", value: "anxiety" },
      { label: "✅ None", value: "none" },
    ],
  },

  // -------------------------
  // SECTION: Habits
  // -------------------------
  { section: "Habits" },

  {
    id: "meal_tracking_plan", icon: "📝", title: "How will you track meals?", subtitle: "Optional",
    type: "single_choice", required: false, dbKey: "meal_tracking_plan",
    options: [
      { label: "Every meal", value: "every_meal" },
      { label: "Only main meals", value: "main_meals" },
      { label: "When I remember", value: "when_i_remember" },
    ],
  },

  {
    id: "consistency_target_days", icon: "📅", title: "Consistency target", subtitle: "Optional",
    type: "single_choice", required: false, dbKey: "consistency_target_days",
    options: [
      { label: "7 days ✅", value: 7 },
      { label: "14 days 🔥", value: 14 },
      { label: "30 days 💪", value: 30 },
      { label: "50 days 🏆", value: 50 },
    ],
  },

  {
    id: "habits_to_improve", icon: "🧠", title: "Habits to improve", subtitle: "Optional (pick up to 3)",
    type: "multi_choice", required: false, dbKey: "habits_to_improve", maxSelect: 3, noneValue: "none",
    options: [
      { label: "🌙 Midnight snacking", value: "midnight_snacker" },
      { label: "🍟 Junk food cravings", value: "junk_food" },
      { label: "🥤 Soda habit", value: "soda" },
      { label: "🍫 Too many sweets", value: "sweets" },
      { label: "✅ None of the above", value: "none" },
    ],
  },

  // -------------------------
  // SECTION: Matrix
  // -------------------------
  { section: "Quick Habit Matrix" },

  {
    id: "habit_matrix", icon: "📊", title: "Quick habit check (matrix)", subtitle: "Optional",
    type: "matrix", required: false, dbKey: "habit_matrix",
    columns: [
      { label: "Never", value: "never" },
      { label: "Sometimes", value: "sometimes" },
      { label: "Often", value: "often" },
      { label: "Daily", value: "daily" },
    ],
    rows: [
      { label: "I drink enough water", key: "water" },
      { label: "I eat fruits/vegetables", key: "veggies" },
      { label: "I sleep 7+ hours", key: "sleep" },
      { label: "I walk/exercise", key: "activity" },
    ],
  },
];