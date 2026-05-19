import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import OnboardingWizard from "../components/OnboardingWizard";

function toIntOrNull(v) {
  if (v === undefined || v === null || v === "") return null;
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : null;
}
function toArray(v) {
  return Array.isArray(v) ? v : [];
}
function toObject(v) {
  return v && typeof v === "object" && !Array.isArray(v) ? v : {};
}

export default function Onboarding() {
  const nav = useNavigate();
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState({});
  const [loading, setLoading] = useState(true);

  // 1) Get session
  useEffect(() => {
    const run = async () => {
      const { data } = await supabase.auth.getSession();
      const s = data?.session;
      if (!s) {
        nav("/auth");
        return;
      }
      setSession(s);
      setLoading(false);
    };
    run();
  }, [nav]);

  // 2) Load profile as initialAnswers (for Edit Profile)
  useEffect(() => {
    const load = async () => {
      if (!session?.user?.id) return;

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .maybeSingle();

      if (error) console.log("Load profile error:", error);
      setProfile(data || {});
    };
    load();
  }, [session?.user?.id]);

  const logout = async () => {
    await supabase.auth.signOut();
    nav("/auth");
  };

  // 3) SAVE profile to Supabase (this was missing)
  const saveProfile = async (answers) => {
    const age = toIntOrNull(answers.age);
    const height = toIntOrNull(answers.height);
    const weight = toIntOrNull(answers.weight);

    if (!(age >= 10 && age <= 90)) throw new Error("Age must be 10–90");
    if (!(height >= 120 && height <= 220)) throw new Error("Height must be 120–220 cm");
    if (!(weight >= 25 && weight <= 250)) throw new Error("Weight must be 25–250 kg");

    const payload = {
      id: session.user.id,

      // base columns
      full_name: answers.full_name || null,
      age,
      gender: answers.gender || "unknown",
      height,
      weight,
      activity_level: answers.activity_level || null,
      goal: answers.goal || null,
      persona: answers.persona || null,
      budget: answers.budget || null,
      dietary_preference: answers.dietary_preference || null,

      // optional columns (if you added them)
      meals_per_day: toIntOrNull(answers.meals_per_day),
      first_meal_time: answers.first_meal_time || null,
      last_meal_time: answers.last_meal_time || null,
      eating_out_frequency: answers.eating_out_frequency || null,
      fasting_style: answers.fasting_style || null,
      consistency_target_days: toIntOrNull(answers.consistency_target_days),
      meal_tracking_plan: answers.meal_tracking_plan || null,
      allergies: answers.allergies || null,

      // jsonb columns
      dietary_restrictions: toArray(answers.dietary_restrictions),
      health_conditions: toArray(answers.health_conditions),
      habits_to_improve: toArray(answers.habits_to_improve),
      habit_matrix: toObject(answers.habit_matrix),
    };

    // store everything else into onboarding_extra (recommended)
    const baseKeys = new Set(Object.keys(payload));
    const onboarding_extra = {};
    for (const [k, v] of Object.entries(answers || {})) {
      if (!baseKeys.has(k)) onboarding_extra[k] = v;
    }
    payload.onboarding_extra = onboarding_extra;

    const { data, error } = await supabase
      .from("profiles")
      .upsert(payload)
      .select()
      .single();

    if (error) throw new Error(error.message);

    setProfile(data);
    return data;
  };

  // 4) On submit => save then go dashboard
  const onSubmit = async (answers) => {
    try {
      await saveProfile(answers);
      nav("/app/dashboard");
    } catch (e) {
      alert(e.message || String(e));
    }
  };

  if (loading) return <div className="panel">Loading onboarding…</div>;

  return (
    <OnboardingWizard
      onSubmit={onSubmit}
      onLogout={logout}
      initialAnswers={profile || {}}
    />
  );
}