import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

// dates
const todayISO = () =>
  new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 10);

const weekStartSunISO = () => {
  const d = new Date();
  d.setDate(d.getDate() - d.getDay());
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 10);
};

const addDaysISO = (iso, days) => {
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const clampPct = (x) => clamp(Math.round(x || 0), 0, 100);

// health math
function activityMultiplier(level) {
  return { sedentary: 1.2, light: 1.35, active: 1.55, very_active: 1.75 }[level] || 1.35;
}
function estimateTDEE({ age, gender, height, weight, activity_level }) {
  const w = Number(weight);
  const h = Number(height);
  const a = Number(age);
  const s = gender === "female" ? -161 : 5;
  const bmr = 10 * w + 6.25 * h - 5 * a + s;
  return Math.round(bmr * activityMultiplier(activity_level));
}
function goalCalories(tdee, goal) {
  if (goal === "weight_loss") return Math.round(tdee * 0.85);
  if (goal === "weight_gain") return Math.round(tdee * 1.1);
  return tdee;
}

// Hero ring (Calories)
function HeroRing({ pct, title, value, sub }) {
  const p = clamp(Number(pct) || 0, 0, 100);
  const size = "clamp(176px, 24vw, 210px)";
  const thickness = 18;

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: `conic-gradient(var(--primary) ${p}%, rgba(0,0,0,0.10) 0)`,
        display: "grid",
        placeItems: "center",
        margin: "0 auto",
      }}
    >
      <div
        style={{
          width: `calc(${size} - ${thickness * 2}px)`,
          height: `calc(${size} - ${thickness * 2}px)`,
          borderRadius: "50%",
          background: "#fff",
          border: "1px solid rgba(0,0,0,0.06)",
          display: "grid",
          placeItems: "center",
          textAlign: "center",
          padding: 8,
        }}
      >
        <div>
          <div style={{ fontWeight: 900, fontSize: 11, color: "var(--text2)", textTransform: "uppercase" }}>
            {title}
          </div>
          <div style={{ fontWeight: 1100, fontSize: 34, margin: "2px 0" }}>{value}</div>
          <div className="caption">{sub}</div>
        </div>
      </div>
    </div>
  );
}

function StatLine({ icon, label, value, target, color }) {
  const pct = clampPct((Number(value) / Math.max(1, Number(target))) * 100);

  return (
    <div
      style={{
        border: "1px solid var(--border)",
        borderRadius: 18,
        background: "#fff",
        padding: 12,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
        <div style={{ fontWeight: 1000 }}>
          {icon} {label}
        </div>
        <div className="caption">
          {value} / {target}
        </div>
      </div>

      <div
        className="progressWrap"
        style={{
          height: 12,
          marginTop: 10,
          background: "rgba(0,0,0,0.06)",
        }}
      >
        <div
          className="progressBar"
          style={{
            width: `${pct}%`,
            background: color,
          }}
        />
      </div>
    </div>
  );
}

export default function Dashboard() {
  const nav = useNavigate();

  const dayISO = useMemo(() => todayISO(), []);
  const weekStart = useMemo(() => weekStartSunISO(), []);
  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDaysISO(weekStart, i)),
    [weekStart]
  );

  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);

  const [todayMetrics, setTodayMetrics] = useState({
    calories_eaten: 0,
    protein_g: 0,
    fat_g: 0,
    carbs_g: 0,
    fiber_g: 0,
    water_ml: 0,
  });

  const [weekMetrics, setWeekMetrics] = useState([]);
  const [todayFoods, setTodayFoods] = useState([]);
  const [busyWater, setBusyWater] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) nav("/auth");
      setSession(data.session);
    });
  }, [nav]);

  useEffect(() => {
    if (!session?.user?.id) return;

    const fetchData = async () => {
      const { data: p } = await supabase.from("profiles").select("*").eq("id", session.user.id).maybeSingle();
      setProfile(p || null);

      const { data: m } = await supabase
        .from("daily_metrics")
        .select("*")
        .eq("user_id", session.user.id)
        .eq("day", dayISO)
        .maybeSingle();
      if (m) setTodayMetrics(m);

      const { data: w } = await supabase
        .from("daily_metrics")
        .select("*")
        .eq("user_id", session.user.id)
        .gte("day", weekDays[0])
        .lte("day", weekDays[6]);
      setWeekMetrics(w || []);

      const { data: f } = await supabase
        .from("food_logs")
        .select("*")
        .eq("user_id", session.user.id)
        .eq("day", dayISO)
        .order("created_at", { ascending: false })
        .limit(4);
      setTodayFoods(f || []);
    };

    fetchData();
  }, [session?.user?.id, dayISO, weekDays]);

  if (!profile) return <div className="panel">Initializing your dashboard…</div>;

  // targets
  const tdee = estimateTDEE(profile);
  const calTarget = goalCalories(tdee, profile.goal);

  const weight = Number(profile.weight) || 60;
  const waterTarget = Math.round(weight * 35) || 2100;

  // macro targets (simple)
  const proteinTarget = Math.round(weight * 1.4);
  const carbsTarget = Math.round((calTarget * 0.45) / 4);
  const fatTarget = Math.round((calTarget * 0.25) / 9);

  // today totals
  const eaten = Number(todayMetrics.calories_eaten || 0);
  const water = Number(todayMetrics.water_ml || 0);
  const calLeft = Math.max(0, calTarget - eaten);

  const calPct = (eaten / Math.max(1, calTarget)) * 100;
  const waterPct = (water / Math.max(1, waterTarget)) * 100;

  const firstName = profile.full_name?.split(" ")[0] || "User";

  // quick “daily story”
  const waterLeft = Math.max(0, waterTarget - water);
  const coachStory =
    waterLeft > 500
      ? `Drink ${Math.min(500, waterLeft)}ml water next. Small wins matter.`
      : calLeft > 400
      ? `You have ${calLeft} kcal left. Aim for protein + vegetables next.`
      : `Nice work today. Keep it light and hydrate well.`;

  const addWater = async (ml) => {
    if (!session?.user?.id) return;
    setBusyWater(true);
    try {
      const next = {
        user_id: session.user.id,
        day: dayISO,
        calories_eaten: Number(todayMetrics.calories_eaten || 0),
        protein_g: Number(todayMetrics.protein_g || 0),
        fat_g: Number(todayMetrics.fat_g || 0),
        carbs_g: Number(todayMetrics.carbs_g || 0),
        fiber_g: Number(todayMetrics.fiber_g || 0),
        water_ml: Number(todayMetrics.water_ml || 0) + ml,
      };
      const { error } = await supabase.from("daily_metrics").upsert(next);
      if (error) throw new Error(error.message);
      setTodayMetrics(next);
    } catch (e) {
      alert("Failed to log water: " + e.message);
    } finally {
      setBusyWater(false);
    }
  };

  return (
    <div className="dashGrid">
      {/* LEFT: Daily Summary (hero) */}
      <div className="panel">
        <div className="sectionHeaderRow">
          <div>
            <div style={{ fontSize: 22, fontWeight: 1100 }}>Hi {firstName} 👋</div>
            <div className="caption">One glance. One action. Keep it simple.</div>
          </div>

          <div className="actionRow">
            <button className="primaryBtnSmall" type="button" onClick={() => nav("/chat")}>
              Add Meal
            </button>

            {/* ✅ ONLY ADDITION: SCANNER BUTTON */}
            <button className="primaryBtnSmall" type="button" onClick={() => nav("/scanner")}>
              📷 Scan Food
            </button>

            <button className="ghostBtn" type="button" onClick={() => nav("/onboarding")}>
              Edit Profile
            </button>
          </div>
        </div>

        <div className="todayCard" style={{ marginTop: 14 }}>
          <div className="todayMainGrid">
            {/* HERO */}
            <div>
              <HeroRing pct={calPct} title="Calories left" value={calLeft} sub={`Target ${calTarget} kcal`} />
              <div
                style={{
                  marginTop: 12,
                  padding: 12,
                  borderRadius: 18,
                  border: "1px solid rgba(255,107,87,0.18)",
                  background: "rgba(255,107,87,0.08)",
                  fontWeight: 900,
                  color: "rgba(26,26,26,0.72)",
                  lineHeight: 1.45,
                  textAlign: "center",
                }}
              >
                🧠 {coachStory}
              </div>
            </div>

            {/* Tracking */}
            <div style={{ display: "grid", gap: 12 }}>
              <div style={{ display: "grid", gap: 12 }}>
                <StatLine
                  icon="🍗"
                  label="Protein"
                  value={Number(todayMetrics.protein_g || 0)}
                  target={proteinTarget}
                  color="#3A86FF"
                />
                <StatLine
                  icon="🍞"
                  label="Carbs"
                  value={Number(todayMetrics.carbs_g || 0)}
                  target={carbsTarget}
                  color="#FFB347"
                />
                <StatLine
                  icon="🧈"
                  label="Fat"
                  value={Number(todayMetrics.fat_g || 0)}
                  target={fatTarget}
                  color="#8338EC"
                />
              </div>

              {/* Water */}
              <div className="box">
                <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 1000 }}>
                  <div>💧 Water</div>
                  <div style={{ color: "var(--accent)" }}>
                    {water} / {waterTarget} ml
                  </div>
                </div>

                <div className="progressWrap" style={{ height: 14, marginTop: 10 }}>
                  <div
                    className="progressBar"
                    style={{
                      width: `${clamp(waterPct, 0, 100)}%`,
                      background: "var(--accent)",
                    }}
                  />
                </div>

                <div className="actionRow" style={{ marginTop: 10 }}>
                  <button className="ghostBtn" type="button" onClick={() => addWater(250)} disabled={busyWater}>
                    +250ml
                  </button>
                  <button className="ghostBtn" type="button" onClick={() => addWater(500)} disabled={busyWater}>
                    +500ml
                  </button>
                </div>
              </div>

              {/* KPI row (clean + small) */}
              <div className="kpiRow">
                <div className="softCard">
                  <div className="kpiTitle">Calories eaten</div>
                  <div className="kpiValue">{eaten} kcal</div>
                  <div className="kpiHint">Target {calTarget}</div>
                </div>
                <div className="softCard">
                  <div className="kpiTitle">Goal</div>
                  <div className="kpiValue">{profile.goal}</div>
                  <div className="kpiHint">Persona {profile.persona}</div>
                </div>
                <div className="softCard">
                  <div className="kpiTitle">Meals today</div>
                  <div className="kpiValue">{todayFoods.length}</div>
                  <div className="kpiHint">Logged via Assistant</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Week strip */}
        <div className="softCard" style={{ marginTop: 14 }}>
          <div style={{ fontWeight: 1100 }}>This Week</div>
          <div className="weekMini">
            {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => {
              const iso = weekDays[i];
              const row = weekMetrics.find((m) => m.day === iso);
              const cals = Number(row?.calories_eaten || 0);
              return (
                <div className="weekPill" key={iso}>
                  <b>{d}</b>
                  <span>{cals} kcal</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* RIGHT: Meals list + empty state */}
      <div className="panel">
        <div className="sectionHeaderRow">
          <div className="hSection" style={{ margin: 0 }}>
            Today’s meals
          </div>
          <button className="smallBtn" type="button" onClick={() => nav("/chat")}>
            Open Assistant
          </button>
        </div>

        <div style={{ display: "grid", gap: 12, marginTop: 12 }}>
          {todayFoods.length ? (
            todayFoods.map((f) => (
              <div
                key={f.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 12,
                  alignItems: "center",
                  paddingBottom: 10,
                  borderBottom: "1px solid var(--border)",
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 1000, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {f.food_name}
                  </div>
                  <div className="caption">{f.source}</div>
                </div>
                <div style={{ fontWeight: 1100, color: "var(--primary)" }}>{f.calories} kcal</div>
              </div>
            ))
          ) : (
            <div style={{ textAlign: "center", padding: "26px 0" }}>
              <div style={{ fontSize: 34 }}>🍽️</div>
              <div style={{ fontWeight: 1100, marginTop: 8 }}>No meals yet</div>
              <div className="caption" style={{ marginTop: 6 }}>
                Start with a photo or a short text like “I ate biryani”.
              </div>
              <button className="primaryBtn" type="button" onClick={() => nav("/chat")} style={{ marginTop: 14 }}>
                Add your first meal
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}