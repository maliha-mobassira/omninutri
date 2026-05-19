import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../lib/supabase";

const BACKEND = import.meta.env.VITE_BACKEND_URL || "http://127.0.0.1:8000";

function todayISO() {
  const d = new Date();
  const tz = d.getTimezoneOffset() * 60000;
  return new Date(Date.now() - tz).toISOString().slice(0, 10);
}

function detectFoodLogIntent(text) {
  const t = (text || "").trim().toLowerCase();
  return (
    t.startsWith("i ate") ||
    t.startsWith("i had") ||
    t.includes("for breakfast") ||
    t.includes("for lunch") ||
    t.includes("for dinner") ||
    t.includes("today i ate")
  );
}

function detectRecipeIntent(text) {
  const t = (text || "").toLowerCase();
  return (
    t.includes("recipe") ||
    t.includes("recepie") ||
    t.includes("ingredients") ||
    t.includes("how to make") ||
    t.includes("steps")
  );
}

async function chatRequest({ message, imageFile }) {
  const form = new FormData();
  if (message) form.append("message", message);
  if (imageFile) form.append("image", imageFile);

  const res = await fetch(`${BACKEND}/chat`, { method: "POST", body: form });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// supports both nutrition formats: direct or totals/items
function pickNutrition(out) {
  const n = out?.nutrition || {};
  const t = n?.totals || n;

  const foodName =
    n.food_name ||
    n.items?.[0]?.food_name ||
    out?.finder?.nutrition?.food_name ||
    "Unknown";

  const quantity =
    n.estimated_quantity ||
    n.items?.[0]?.quantity ||
    out?.finder?.nutrition?.estimated_quantity ||
    "";

  const calories = Number(t.calories || 0);
  const protein = Number(t.protein || t.protein_g || 0);
  const fat = Number(t.fat || t.fat_g || 0);
  const carbohydrates = Number(t.carbohydrates || t.carbs_g || 0);
  const fiber = Number(t.fiber || t.fiber_g || 0);

  const needsClarification = Boolean(n.needs_clarification);
  const question = n.question || "";

  return {
    foodName,
    quantity,
    calories,
    protein,
    fat,
    carbohydrates,
    fiber,
    needsClarification,
    question,
  };
}

// ---------- Supabase chat storage ----------
async function ensureThread({ userId, day }) {
  // Upsert one thread per user/day (matches your unique index)
  const { data, error } = await supabase
    .from("chat_threads")
    .upsert(
      {
        user_id: userId,
        day, // date column, ISO string OK
        title: day === todayISO() ? "Today" : day,
      },
      { onConflict: "user_id,day" }
    )
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return data;
}

async function loadMessages(threadId) {
  const { data, error } = await supabase
    .from("chat_messages")
    .select("*")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);
  return data || [];
}

async function insertMessage({ threadId, userId, role, content, ui }) {
  const { error } = await supabase.from("chat_messages").insert({
    thread_id: threadId,
    user_id: userId,
    role,
    content,
    ui: ui || {},
  });
  if (error) throw new Error(error.message);
}

async function clearThread(threadId) {
  const { error } = await supabase.from("chat_messages").delete().eq("thread_id", threadId);
  if (error) throw new Error(error.message);
}

async function listThreads(userId) {
  const { data, error } = await supabase
    .from("chat_threads")
    .select("id, day, title, updated_at")
    .eq("user_id", userId)
    .order("day", { ascending: false });

  if (error) throw new Error(error.message);
  return data || [];
}

// ---------- Meal logging ----------
async function saveMealToSupabase({ out, userMessage, source }) {
  const { data: sessionData } = await supabase.auth.getSession();
  const user = sessionData?.session?.user;
  if (!user) throw new Error("Not logged in");

  const day = todayISO();
  const nut = pickNutrition(out);

  if (!nut.foodName || nut.foodName.toLowerCase().includes("unknown")) return { skipped: true };
  if (!Number.isFinite(nut.calories) || nut.calories <= 0) return { skipped: true };
  if (nut.needsClarification) return { skipped: true };

  // 1) insert food log
  const insertRow = {
    user_id: user.id,
    day,
    source: source || out?.source || "text",
    user_message: userMessage || null,
    food_name: nut.foodName,
    quantity: nut.quantity || null,
    calories: nut.calories,
    protein: nut.protein,
    fat: nut.fat,
    carbohydrates: nut.carbohydrates,
    fiber: nut.fiber,
    nutrition_json: out,
  };

  const { error: insErr } = await supabase.from("food_logs").insert(insertRow);
  if (insErr) throw new Error(insErr.message);

  // 2) update daily_metrics (fix: onConflict)
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

// ---------- UI component ----------
export default function Chat() {
  const [userId, setUserId] = useState(null);

  const [threads, setThreads] = useState([]);
  const [activeDay, setActiveDay] = useState(todayISO());
  const today = todayISO();

  const [threadId, setThreadId] = useState(null);

  const [text, setText] = useState("");
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);

  const [mode, setMode] = useState("auto"); // auto | log | recipe | coach

  const defaultMsgs = useMemo(
    () => [
      {
        role: "ai",
        content:
          "Tell me what you ate (text) or upload a food photo.\n\nModes: Log meal • Recipe • Coach.",
        ui: null,
      },
    ],
    []
  );

  const [messages, setMessages] = useState(defaultMsgs);

  const listRef = useRef(null);

  // load user
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const id = data?.session?.user?.id || null;
      setUserId(id);
    });
  }, []);

  // load thread list
  useEffect(() => {
    const run = async () => {
      if (!userId) return;
      const t = await listThreads(userId);
      setThreads(t);
    };
    run();
  }, [userId]);

  // open thread for selected day and load messages
  useEffect(() => {
    const run = async () => {
      if (!userId) return;

      const th = await ensureThread({ userId, day: activeDay });
      setThreadId(th.id);

      const rows = await loadMessages(th.id);

      if (!rows.length) {
        setMessages(defaultMsgs);
      } else {
        setMessages(
          rows.map((r) => ({
            role: r.role,
            content: r.content,
            ui: r.ui && Object.keys(r.ui).length ? r.ui : null,
          }))
        );
      }

      // refresh thread list (so new day appears)
      const t = await listThreads(userId);
      setThreads(t);
    };

    run();
  }, [userId, activeDay, defaultMsgs]);

  // scroll down
  useEffect(() => {
    if (!listRef.current) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, busy]);

  const chips = useMemo(
    () => [
      { label: "Log meal", value: "log" },
      { label: "Recipe", value: "recipe" },
      { label: "Coach", value: "coach" },
      { label: "Auto", value: "auto" },
    ],
    []
  );

  const applyMode = (m) => {
    setMode(m);
    if (m === "log") setText("I ate ");
    if (m === "recipe") setText("Give me a recipe for ");
    if (m === "coach") setText("How many calories should I eat per day?");
    if (m === "auto") setText("");
  };

  const newChatToday = async () => {
    // A) Clear today's chat
    if (!userId) return;

    const th = await ensureThread({ userId, day: today });
    await clearThread(th.id);

    setActiveDay(today);
    setThreadId(th.id);
    setMessages(defaultMsgs);

    const t = await listThreads(userId);
    setThreads(t);
  };

  const send = async (overrideText) => {
    if (!userId || !threadId) return;

    // Prevent sending while viewing history
    if (activeDay !== today) return;

    const msg = (overrideText ?? text).trim();
    if (!msg && !file) return;

    setBusy(true);

    try {
      // 1) save user msg to DB (if any)
      if (msg) {
        await insertMessage({ threadId, userId, role: "user", content: msg });
        setMessages((m) => [...m, { role: "user", content: msg }]);
      }
      if (file) {
        const uploadLine = `[Image uploaded: ${file.name}]`;
        await insertMessage({ threadId, userId, role: "user", content: uploadLine });
        setMessages((m) => [...m, { role: "user", content: uploadLine }]);
      }

      // 2) call backend
      let finalMsg = msg;
      if (mode === "recipe" && msg && !detectRecipeIntent(msg)) finalMsg = `Recipe request: ${msg}`;
      if (mode === "coach" && msg) finalMsg = `Coaching question: ${msg}`;

      const out = await chatRequest({ message: finalMsg || "analyze", imageFile: file });

      const aiText = out.message || JSON.stringify(out, null, 2);
      const aiUI = out.ui || null;

      // 3) save AI msg to DB
      await insertMessage({ threadId, userId, role: "ai", content: aiText, ui: aiUI || {} });

      setMessages((m) => [...m, { role: "ai", content: aiText, ui: aiUI }]);

      // 4) log meal if appropriate
      const shouldLog =
        Boolean(file) ||
        (detectFoodLogIntent(msg) && !detectRecipeIntent(msg));

      if (shouldLog) {
        try {
          const source = file ? "image" : "text";
          const saved = await saveMealToSupabase({ out, userMessage: msg || "image", source });
          if (saved?.ok) {
            const okLine = "✅ Logged to today’s meals and updated your daily totals.";
            await insertMessage({ threadId, userId, role: "ai", content: okLine });
            setMessages((m) => [...m, { role: "ai", content: okLine }]);
          }
        } catch (e) {
          const errLine = `⚠️ Answered, but couldn't save log: ${e.message}`;
          await insertMessage({ threadId, userId, role: "ai", content: errLine });
          setMessages((m) => [...m, { role: "ai", content: errLine }]);
        }
      }

      setText("");
      setFile(null);
      setMode("auto");

      // refresh threads (updated_at)
      const t = await listThreads(userId);
      setThreads(t);
    } catch (e) {
      const errLine = `Error: ${e.message}`;
      try {
        await insertMessage({ threadId, userId, role: "ai", content: errLine });
      } catch {0}
      setMessages((m) => [...m, { role: "ai", content: errLine }]);
    } finally {
      setBusy(false);
    }
  };

  if (!userId) {
    return (
      <div className="panel">
        <div style={{ fontWeight: 1000 }}>Assistant</div>
        <div className="caption" style={{ marginTop: 8 }}>
          Please login first.
        </div>
      </div>
    );
  }

  return (
    <div className="panel">
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ fontWeight: 1100 }}>Assistant</div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <select
            className="input"
            style={{ height: 44, width: 170 }}
            value={activeDay}
            onChange={(e) => setActiveDay(e.target.value)}
            title="Chat history by day"
          >
            {/* Today always on top */}
            <option value={today}>Today</option>

            {threads
              .filter((t) => String(t.day) !== today)
              .map((t) => (
                <option key={t.id} value={String(t.day)}>
                  {String(t.day)}
                </option>
              ))}
          </select>

          <button className="smallBtn" type="button" onClick={newChatToday} title="Clear today and start fresh">
            New chat
          </button>
        </div>
      </div>

      {/* Chips horizontal scroll on phone */}
      <div
        style={{
          display: "flex",
          gap: 10,
          overflowX: "auto",
          paddingBottom: 6,
          marginTop: 12,
          WebkitOverflowScrolling: "touch",
        }}
      >
        {chips.map((c) => (
          <button
            key={c.value}
            type="button"
            className={mode === c.value ? "toggleActive" : "toggle"}
            onClick={() => applyMode(c.value)}
            style={{
              padding: "10px 14px",
              borderRadius: 999,
              border: "1px solid var(--border)",
              whiteSpace: "nowrap",
              flex: "0 0 auto",
            }}
          >
            {c.label}
          </button>
        ))}
      </div>

      {activeDay !== today && (
        <div className="caption" style={{ marginTop: 8 }}>
          Viewing history ({activeDay}). Switch to “Today” to chat/log meals.
        </div>
      )}

      <div className="chatWrap" style={{ marginTop: 12 }}>
        <div className="chatList" ref={listRef}>
          {messages.map((m, i) => (
            <div key={i} className={`bubble ${m.role === "user" ? "user" : "ai"}`} style={{ maxWidth: "92%" }}>
              {m.content}

              {/* clarification buttons */}
              {m.role === "ai" && m.ui?.type === "clarification" && Array.isArray(m.ui.options) && (
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
                  {m.ui.options.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      className="smallBtn"
                      onClick={() => send(opt)}
                      style={{ height: 36 }}
                      disabled={busy || activeDay !== today}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
          {busy && <div className="bubble ai">Thinking…</div>}
        </div>

        <div className="chatDock">
          <label className="iconBtn" title="Upload image">
            +
            <input
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              disabled={busy || activeDay !== today}
            />
          </label>

          <textarea
            className="input"
            placeholder={
              mode === "log"
                ? "Example: I ate 1 chicken burger and fries"
                : mode === "recipe"
                ? "Example: grilled cheese recipe"
                : mode === "coach"
                ? "Example: how many calories left today?"
                : "Type a message…"
            }
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={1}
            style={{ height: 56, resize: "none", paddingTop: 16 }}
            disabled={busy || activeDay !== today}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
          />

          <button
            className="primaryBtn"
            type="button"
            onClick={() => send()}
            disabled={busy || activeDay !== today}
            style={{ width: 130, height: 56 }}
          >
            Send
          </button>
        </div>

        {file && <div className="caption">Selected image: {file.name}</div>}
        <div className="caption">
          Image uploads or “I ate …” messages will be logged into today’s totals automatically.
        </div>
      </div>
    </div>
  );
} 