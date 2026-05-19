import { useEffect, useMemo, useState } from "react";
import { supabase } from "./lib/supabase";
import OnboardingWizard from "./components/OnboardingWizard";

// ---------- Helpers ----------
function calcBMI(weightKg, heightCm) {
  const m = Number(heightCm) / 100;
  return (Number(weightKg) / (m * m)).toFixed(1);
}

function activityMultiplier(level) {
  return { sedentary: 1.2, light: 1.35, active: 1.55, very_active: 1.75 }[level] || 1.35;
}

function estimateTDEE({ age, gender, height, weight, activity_level }) {
  const w = Number(weight);
  const h = Number(height);
  const a = Number(age);
  const s = gender === "female" ? -161 : 5; // MVP fallback
  const bmr = 10 * w + 6.25 * h - 5 * a + s;
  return Math.round(bmr * activityMultiplier(activity_level));
}

function isProfileComplete(p) {
  if (!p) return false;
  const ageOk = Number(p.age) >= 10 && Number(p.age) <= 90;
  const heightOk = Number(p.height) >= 120 && Number(p.height) <= 220;
  const weightOk = Number(p.weight) >= 25 && Number(p.weight) <= 250;
  return ageOk && heightOk && weightOk && !!p.activity_level && !!p.goal && !!p.persona;
}

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
const fmtTime = (t) => (t ? String(t).slice(0, 5) : "—");

function todayISO() {
  const d = new Date();
  const tz = d.getTimezoneOffset() * 60000;
  return new Date(Date.now() - tz).toISOString().slice(0, 10);
}
function addDaysISO(iso, days) {
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}
function weekStartSunISO() {
  const now = new Date();
  const dayIndex = now.getDay(); // 0=Sun
  const start = new Date(now);
  start.setDate(now.getDate() - dayIndex);
  const tz = start.getTimezoneOffset() * 60000;
  return new Date(start.getTime() - tz).toISOString().slice(0, 10);
}
function clampPct(x) {
  if (!Number.isFinite(x)) return 0;
  return Math.max(0, Math.min(100, Math.round(x)));
}

export default function App() {
  const [session, setSession] = useState(null);

  const [profile, setProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [forceOnboarding, setForceOnboarding] = useState(false);

  // Tracking data
  const [todayMetrics, setTodayMetrics] = useState(null);
  const [weekMetrics, setWeekMetrics] = useState([]);

  const [mode, setMode] = useState("login"); // login | signup
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");

  const dayISO = useMemo(() => todayISO(), []);
  const weekStart = useMemo(() => weekStartSunISO(), []);
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDaysISO(weekStart, i)), [weekStart]);

  // ---------- AUTH ----------
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });
    return () => authListener.subscription.unsubscribe();
  }, []);

  // ---------- LOAD PROFILE ----------
  useEffect(() => {
    const loadProfile = async () => {
      setProfile(null);

      if (!session?.user?.id) {
        setLoadingProfile(false);
        return;
      }

      setLoadingProfile(true);
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .maybeSingle();

      if (error) console.log("Profile load error:", error);

      setProfile(data || null);
      setLoadingProfile(false);
    };

    loadProfile();
  }, [session?.user?.id]);

  // ---------- LOAD METRICS (today + week) ----------
  useEffect(() => {
    const loadMetrics = async () => {
      if (!session?.user?.id) return;

      // Today
      const { data: todayRow, error: tErr } = await supabase
        .from("daily_metrics")
        .select("*")
        .eq("user_id", session.user.id)
        .eq("day", dayISO)
        .maybeSingle();

      if (tErr) console.log("today metrics error:", tErr);

      setTodayMetrics(
        todayRow || {
          user_id: session.user.id,
          day: dayISO,
          calories_eaten: 0,
          protein_g: 0,
          fat_g: 0,
          carbs_g: 0,
          fiber_g: 0,
          water_ml: 0,
        }
      );

      // Week range
      const { data: weekRows, error: wErr } = await supabase
        .from("daily_metrics")
        .select("*")
        .eq("user_id", session.user.id)
        .gte("day", weekDays[0])
        .lte("day", weekDays[6]);

      if (wErr) console.log("week metrics error:", wErr);

      setWeekMetrics(weekRows || []);
    };

    loadMetrics();
  }, [session?.user?.id, dayISO, weekDays]);

  // ---------- AUTH actions ----------
  const signup = async (e) => {
    e.preventDefault();
    setMsg("");
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) setMsg(error.message);
    else setMsg("Signup successful. Check your email to verify your account (OTP link).");
  };

  const login = async (e) => {
    e.preventDefault();
    setMsg("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setMsg(error.message);
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
    setForceOnboarding(false);
    setTodayMetrics(null);
    setWeekMetrics([]);
  };

  // ---------- SAVE PROFILE ----------
  const saveProfile = async (answers) => {
    const age = toIntOrNull(answers.age);
    const height = toIntOrNull(answers.height);
    const weight = toIntOrNull(answers.weight);

    if (!(age >= 10 && age <= 90)) return alert("Age must be 10–90");
    if (!(height >= 120 && height <= 220)) return alert("Height must be 120–220 cm");
    if (!(weight >= 25 && weight <= 250)) return alert("Weight must be 25–250 kg");

    const payload = {
      id: session.user.id,

      // base
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

      // optional columns
      meals_per_day: toIntOrNull(answers.meals_per_day),
      first_meal_time: answers.first_meal_time || null,
      last_meal_time: answers.last_meal_time || null,
      eating_out_frequency: answers.eating_out_frequency || null,
      fasting_style: answers.fasting_style || null,
      consistency_target_days: toIntOrNull(answers.consistency_target_days),
      meal_tracking_plan: answers.meal_tracking_plan || null,
      allergies: answers.allergies || null,

      dietary_restrictions: toArray(answers.dietary_restrictions),
      health_conditions: toArray(answers.health_conditions),
      habits_to_improve: toArray(answers.habits_to_improve),
      habit_matrix: toObject(answers.habit_matrix),
    };

    // store extras
    const baseKeys = new Set(Object.keys(payload));
    const onboarding_extra = {};
    for (const [k, v] of Object.entries(answers || {})) {
      if (!baseKeys.has(k)) onboarding_extra[k] = v;
    }
    payload.onboarding_extra = onboarding_extra;

    const { data, error } = await supabase.from("profiles").upsert(payload).select().single();
    if (error) return alert("Save failed: " + error.message);

    setProfile(data);
    setForceOnboarding(false);
  };

  // ---------- TRACKING WRITES ----------
  async function upsertTodayMetrics(patch) {
    if (!session?.user?.id) throw new Error("Not logged in");

    const { data: existing } = await supabase
      .from("daily_metrics")
      .select("*")
      .eq("user_id", session.user.id)
      .eq("day", dayISO)
      .maybeSingle();

    const next = {
      user_id: session.user.id,
      day: dayISO,
      calories_eaten: Number(existing?.calories_eaten || 0),
      protein_g: Number(existing?.protein_g || 0),
      fat_g: Number(existing?.fat_g || 0),
      carbs_g: Number(existing?.carbs_g || 0),
      fiber_g: Number(existing?.fiber_g || 0),
      water_ml: Number(existing?.water_ml || 0),
      ...patch,
    };

    const { error } = await supabase.from("daily_metrics").upsert(next);
    if (error) throw new Error(error.message);

    setTodayMetrics(next);
  }

  const logWater250 = async () => {
    try {
      await upsertTodayMetrics({ water_ml: Number(todayMetrics?.water_ml || 0) + 250 });
      alert("✅ Water logged: +250ml");
    } catch (e) {
      alert("Failed to log water: " + e.message);
    }
  };

  const logMealManual = async () => {
    try {
      const desc = prompt("Meal description (e.g., chicken burger + fries):");
      if (!desc) return;

      const kcalStr = prompt("Calories (number):", "400");
      const kcal = Number(kcalStr || 0);

      const insertRow = {
        user_id: session.user.id,
        day: dayISO,
        source: "manual",
        user_message: desc,
        food_name: desc,
        quantity: "",
        calories: kcal,
        protein: 0,
        fat: 0,
        carbohydrates: 0,
        fiber: 0,
        nutrition_json: { manual: true, description: desc, calories: kcal },
      };

      const { error: insErr } = await supabase.from("food_logs").insert(insertRow);
      if (insErr) throw new Error(insErr.message);

      await upsertTodayMetrics({ calories_eaten: Number(todayMetrics?.calories_eaten || 0) + kcal });

      alert("✅ Meal logged");
    } catch (e) {
      alert("Failed to log meal: " + e.message);
    }
  };

  // ---------- UI routing ----------
  if (session && loadingProfile) {
    return (
      <div className="container">
        <div className="card">Loading profile...</div>
      </div>
    );
  }

  if (session && (forceOnboarding || !profile || !isProfileComplete(profile))) {
    return (
      <OnboardingWizard
        onSubmit={saveProfile}
        onLogout={logout}
        initialAnswers={profile || {}}
      />
    );
  }

  // ---------- DASHBOARD ----------
  if (session && profile) {
    const bmi = calcBMI(profile.weight, profile.height);
    const tdee = estimateTDEE(profile);

    const target =
      profile.goal === "weight_loss" ? Math.round(tdee * 0.85) :
      profile.goal === "weight_gain" ? Math.round(tdee * 1.10) :
      tdee;

    const bmiNum = Number(bmi);
    const bmiLabel =
      bmiNum < 18.5 ? "Underweight" :
      bmiNum < 25 ? "Normal" :
      bmiNum < 30 ? "Overweight" :
      "High";

    const mealWindow = `${fmtTime(profile.first_meal_time)} → ${fmtTime(profile.last_meal_time)}`;
    const fasting = profile.fasting_style || "none";

    const eaten = Number(todayMetrics?.calories_eaten || 0);
    const water = Number(todayMetrics?.water_ml || 0);

    const calPct = clampPct((eaten / target) * 100);
    const waterTarget = Math.max(1500, Math.min(4000, Math.round(Number(profile.weight) * 35)));
    const waterPct = clampPct((water / waterTarget) * 100);

    return (
      <div className="container">
        <div className="card">
          <div className="topRow">
            <div className="brand">
              <h1>OmniNutri</h1>
              <p>Dashboard</p>
            </div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button className="smallBtn" onClick={() => setForceOnboarding(true)}>Edit Profile</button>
              <button className="smallBtn" onClick={logout}>Logout</button>
            </div>
          </div>

          <div className="dashGrid">
            {/* LEFT: Stats */}
            <div className="panel">
              <div className="statCards">
                <div className="statCard">
                  <div className="statTop">
                    <div className="statTitle">BMI</div>
                    <div className="badge">{bmiLabel}</div>
                  </div>
                  <div className="statValue">{bmi}</div>
                  <div className="statSub">Based on height/weight</div>
                </div>

                <div className="statCard">
                  <div className="statTop">
                    <div className="statTitle">Daily Calories</div>
                    <div className="badge">{profile.goal}</div>
                  </div>
                  <div className="statValue">{target} kcal</div>
                  <div className="statSub">Estimated target</div>
                </div>

                <div className="statCard">
                  <div className="statTop">
                    <div className="statTitle">Meal Window</div>
                    <div className="badge">Timing</div>
                  </div>
                  <div className="statValue" style={{ fontSize: 18 }}>{mealWindow}</div>
                  <div className="statSub">First → last meal</div>
                </div>

                <div className="statCard">
                  <div className="statTop">
                    <div className="statTitle">Fasting</div>
                    <div className="badge">Plan</div>
                  </div>
                  <div className="statValue" style={{ fontSize: 18 }}>{fasting}</div>
                  <div className="statSub">Intermittent fasting</div>
                </div>
              </div>

              {/* TODAY progress */}
              <div className="box" style={{ marginTop: 14 }}>
                <div className="statTitle">Today</div>

                <div className="todayRow">
                  <div><b>Calories:</b> {eaten} / {target} kcal</div>
                  <div className="progressWrap" style={{ marginTop: 10 }}>
                    <div className="progressBar" style={{ width: `${calPct}%` }} />
                  </div>
                  <div className="note">{Math.max(0, target - eaten)} kcal remaining</div>
                </div>

                <div style={{ marginTop: 12 }}>
                  <div><b>Water:</b> {water} / {waterTarget} ml</div>
                  <div className="progressWrap" style={{ marginTop: 10 }}>
                    <div className="progressBar" style={{ width: `${waterPct}%` }} />
                  </div>
                </div>
              </div>

              {/* WEEK strip */}
              <div className="box" style={{ marginTop: 14 }}>
                <div className="statTitle">This Week (Sun–Sat)</div>
                <div className="weekStrip">
                  {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map((name, i) => {
                    const iso = weekDays[i];
                    const row = weekMetrics.find(r => r.day === iso);
                    const cals = Number(row?.calories_eaten || 0);

                    return (
                      <div className="dayChip" key={iso}>
                        <div className="dayName">{name}</div>
                        <div className="dayVal">{cals} kcal</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Profile quick view */}
              <div style={{ marginTop: 14 }}>
                <div className="statTitle">Profile</div>
                <div className="kv">
                  <div>Email</div><span>{session.user.email}</span>
                  <div>Name</div><span>{profile.full_name || "—"}</span>
                  <div>Persona</div><span>{profile.persona}</span>
                  <div>Activity</div><span>{profile.activity_level}</span>
                  <div>Budget</div><span>{profile.budget || "—"}</span>
                </div>
              </div>
            </div>

            {/* RIGHT: Actions */}
            <div className="panel">
              <div className="statTitle">Quick Actions</div>

              <button className="actionBtn actionPrimary" style={{ marginTop: 12 }} onClick={logMealManual}>
                <span>🍽️ Log Meal (Manual)</span>
                <span className="pill">Now</span>
              </button>

              <button className="actionBtn" style={{ marginTop: 10 }} onClick={logWater250}>
                <span>💧 Log Water (+250ml)</span>
                <span className="pill">Now</span>
              </button>

              <button className="actionBtn" style={{ marginTop: 10 }} onClick={() => alert("Next: Scan page will save from /chat automatically")}>
                <span>📷 Scan My Meal</span>
                <span className="pill">Next</span>
              </button>

              <div className="note" style={{ marginTop: 12 }}>
                Next we’ll connect Scan/Chat to food_logs automatically.
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ---------- AUTH screen ----------
  return (
    <div className="container">
      <div className="card" style={{ maxWidth: 560 }}>
        <div className="brand">
          <h1>OmniNutri</h1>
          <p>Your AI Nutrition & Lifestyle Guide</p>
        </div>

        <div className="toggleRow" style={{ marginTop: 16 }}>
          <button className={mode === "login" ? "toggleActive" : "toggle"} onClick={() => setMode("login")}>
            Login
          </button>
          <button className={mode === "signup" ? "toggleActive" : "toggle"} onClick={() => setMode("signup")}>
            Signup
          </button>
        </div>

        <form onSubmit={mode === "login" ? login : signup}>
          <input className="input" type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input className="input" type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <button className="button" type="submit">{mode === "login" ? "Login" : "Create Account"}</button>
        </form>

        {msg && <div className="warn" style={{ marginTop: 12 }}>{msg}</div>}
        <div className="note">After signup, Supabase sends a verification email (OTP-style link).</div>
      </div>
    </div>
  );
}