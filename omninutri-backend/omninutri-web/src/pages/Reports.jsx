import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";

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

export default function Reports() {
  const dayISO = useMemo(() => todayISO(), []);
  const weekStart = useMemo(() => weekStartSunISO(), []);
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDaysISO(weekStart, i)), [weekStart]);

  const [session, setSession] = useState(null);
  const [todayRow, setTodayRow] = useState(null);
  const [weekRows, setWeekRows] = useState([]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
  }, []);

  useEffect(() => {
    const run = async () => {
      if (!session?.user?.id) return;

      const { data: t } = await supabase
        .from("daily_metrics")
        .select("*")
        .eq("user_id", session.user.id)
        .eq("day", dayISO)
        .maybeSingle();

      setTodayRow(t || { calories_eaten: 0, water_ml: 0 });

      const { data: w } = await supabase
        .from("daily_metrics")
        .select("*")
        .eq("user_id", session.user.id)
        .gte("day", weekDays[0])
        .lte("day", weekDays[6]);

      setWeekRows(w || []);
    };

    run();
  }, [session?.user?.id, dayISO, weekDays]);

  const calories = Number(todayRow?.calories_eaten || 0);
  const water = Number(todayRow?.water_ml || 0);

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div className="panel">
        <h2 className="hSection">Insights</h2>
        <div className="caption">Your progress, simplified.</div>

        <div className="box" style={{ marginTop: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div className="panel" style={{ boxShadow: "none" }}>
              <div className="caption">Today Calories</div>
              <div style={{ fontWeight: 1100, fontSize: 26, marginTop: 6 }}>{calories} kcal</div>
            </div>
            <div className="panel" style={{ boxShadow: "none" }}>
              <div className="caption">Today Water</div>
              <div style={{ fontWeight: 1100, fontSize: 26, marginTop: 6 }}>{water} ml</div>
            </div>
          </div>
        </div>
      </div>

      <div className="panel">
        <h2 className="hSection">This Week</h2>
        <div className="caption">Calories per day (Sun–Sat)</div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 10, marginTop: 14, alignItems: "end" }}>
          {weekDays.map((iso, i) => {
            const row = weekRows.find((r) => r.day === iso);
            const cals = Number(row?.calories_eaten || 0);
            const h = clamp((cals / 2500) * 100, 8, 100);

            return (
              <div key={iso} style={{ textAlign: "center" }}>
                <div style={{ height: 120, display: "flex", alignItems: "end", justifyContent: "center" }}>
                  <div style={{
                    width: 20,
                    height: `${h}%`,
                    borderRadius: 999,
                    background: "linear-gradient(180deg, rgba(255,107,87,0.35), rgba(255,107,87,1))"
                  }} />
                </div>
                <div className="caption" style={{ marginTop: 6 }}>{["S","M","T","W","T","F","S"][i]}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}