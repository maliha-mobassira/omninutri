import { supabase } from "./supabase";
import { todayISO } from "./date";

function pickNutrition(chatRes) {
  const n = chatRes?.nutrition || {};
  const totals = n?.totals || n;

  return {
    needs_clarification: Boolean(n.needs_clarification),
    food_name: n.food_name || n.items?.[0]?.food_name || "Unknown",
    quantity: n.estimated_quantity || n.items?.[0]?.quantity || "",
    calories: Number(totals.calories || 0),
    protein: Number(totals.protein || totals.protein_g || 0),
    fat: Number(totals.fat || totals.fat_g || 0),
    carbohydrates: Number(totals.carbohydrates || totals.carbs_g || 0),
    fiber: Number(totals.fiber || totals.fiber_g || 0),
  };
}

export async function saveMealFromChat({ chatRes, userMessage, source }) {
  const { data } = await supabase.auth.getSession();
  const user = data?.session?.user;
  if (!user) throw new Error("Not logged in");

  const nut = pickNutrition(chatRes);
  if (nut.needs_clarification) throw new Error("Needs clarification. Not saved yet.");

  const day = todayISO();

  // food_logs insert
  const { error: insErr } = await supabase.from("food_logs").insert({
    user_id: user.id,
    day,
    source: source || chatRes?.source || "text",
    user_message: userMessage || null,
    food_name: nut.food_name,
    quantity: nut.quantity,
    calories: nut.calories,
    protein: nut.protein,
    fat: nut.fat,
    carbohydrates: nut.carbohydrates,
    fiber: nut.fiber,
    nutrition_json: chatRes,
  });
  if (insErr) throw new Error(insErr.message);

  // daily_metrics update (IMPORTANT: onConflict)
  const { data: existing, error: selErr } = await supabase
    .from("daily_metrics")
    .select("*")
    .eq("user_id", user.id)
    .eq("day", day)
    .maybeSingle();
  if (selErr) throw new Error(selErr.message);

  const next = {
    user_id: user.id,
    day,
    calories_eaten: Number(existing?.calories_eaten || 0) + nut.calories,
    protein_g: Number(existing?.protein_g || 0) + nut.protein,
    fat_g: Number(existing?.fat_g || 0) + nut.fat,
    carbs_g: Number(existing?.carbs_g || 0) + nut.carbohydrates,
    fiber_g: Number(existing?.fiber_g || 0) + nut.fiber,
    water_ml: Number(existing?.water_ml || 0),
  };

  const { error: upErr } = await supabase
    .from("daily_metrics")
    .upsert(next, { onConflict: "user_id,day" });
  if (upErr) throw new Error(upErr.message);

  return { ok: true };
}

export async function addWaterMl(amount) {
  const { data } = await supabase.auth.getSession();
  const user = data?.session?.user;
  if (!user) throw new Error("Not logged in");

  const day = todayISO();

  const { data: existing } = await supabase
    .from("daily_metrics")
    .select("*")
    .eq("user_id", user.id)
    .eq("day", day)
    .maybeSingle();

  const next = {
    user_id: user.id,
    day,
    calories_eaten: Number(existing?.calories_eaten || 0),
    protein_g: Number(existing?.protein_g || 0),
    fat_g: Number(existing?.fat_g || 0),
    carbs_g: Number(existing?.carbs_g || 0),
    fiber_g: Number(existing?.fiber_g || 0),
    water_ml: Number(existing?.water_ml || 0) + Number(amount || 0),
  };

  const { error } = await supabase
    .from("daily_metrics")
    .upsert(next, { onConflict: "user_id,day" });

  if (error) throw new Error(error.message);
  return { ok: true };
}