import { useEffect, useMemo, useRef, useState } from "react";
import { onboardingSteps } from "../onboardingSteps";

// "08:30:00" -> "08:30"
function toHHmm(t) {
  if (!t) return "";
  return String(t).slice(0, 5);
}

function isSectionStep(s) {
  return !!(s && s.section && !s.type);
}

function getCurrentSection(steps, idx) {
  for (let i = idx; i >= 0; i--) {
    const s = steps[i];
    if (s && s.section && !s.type) return s.section;
  }
  return null;
}

const COACH_TIPS = {
  full_name: "This helps OmniNutri personalize your experience.",
  age: "Age is used for calorie targets.",
  gender: "Optional. Improves calorie estimate slightly.",
  height: "Used with weight to estimate BMI and daily calories.",
  weight: "Used to estimate calorie, protein, and water targets.",
  activity_level: "Activity changes your daily needs.",
  goal: "Goal changes your calorie target + coaching style.",
  persona: "Helps suggestions fit your lifestyle and budget.",
  budget: "Helps meal ideas stay realistic.",
  dietary_preference: "Avoids suggestions you won’t enjoy.",
  dietary_restrictions: "We’ll avoid foods you can’t/don’t eat.",
  allergies: "Safety first.",
  health_conditions: "Optional. Tailors safer advice.",
  meal_times: "Helps routine and fasting guidance.",
  fasting_style: "Helps structure eating window advice.",
  habits_to_improve: "We’ll focus coaching here first.",
  habit_matrix: "Helps OmniNutri understand your baseline habits.",
};

export default function OnboardingWizard({ onSubmit, onLogout, initialAnswers }) {
  const steps = useMemo(() => onboardingSteps, []);
  const contentRef = useRef(null);

  const [answers, setAnswers] = useState(() => {
    const base = initialAnswers || {};
    const extra =
      base && typeof base.onboarding_extra === "object" && base.onboarding_extra
        ? base.onboarding_extra
        : {};
    const merged = { ...base, ...extra };

    merged.first_meal_time = toHHmm(merged.first_meal_time);
    merged.last_meal_time = toHHmm(merged.last_meal_time);
    return merged;
  });

  const [idx, setIdx] = useState(0);
  const [touched, setTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Auto-skip section headers
  useEffect(() => {
    if (isSectionStep(steps[idx])) {
      let j = idx;
      while (j < steps.length && isSectionStep(steps[j])) j++;
      setIdx(Math.min(j, steps.length - 1));
    }
  }, [idx, steps]);

  useEffect(() => {
    setTouched(false);
    if (contentRef.current) contentRef.current.scrollTop = 0;
  }, [idx]);

  const step = steps[idx];
  const sectionName = getCurrentSection(steps, idx);

  const setOne = (key, val) => setAnswers((p) => ({ ...p, [key]: val }));
  const value = step?.dbKey ? answers[step.dbKey] : undefined;

  const validationMessage = () => {
    if (!step || isSectionStep(step)) return "";
    if (!step.required) {
      if (step.type === "time_range") {
        const a = answers[step.dbKeys[0]];
        const b = answers[step.dbKeys[1]];
        if ((a && !b) || (!a && b)) return "Set both times or leave both empty.";
      }
      return "";
    }

    if (step.type === "text") return "Please enter a value.";
    if (step.type === "number") return `Enter a valid number (${step.min}–${step.max}).`;
    if (step.type === "single_choice") return "Please select one option.";
    if (step.type === "multi_choice") return "Please select at least one option.";
    if (step.type === "time_range") return "Please select both times.";
    if (step.type === "slider") return "Please choose a value.";
    if (step.type === "matrix") return "Please answer all rows.";
    return "Please complete this step.";
  };

  const isValid = () => {
    if (!step || isSectionStep(step)) return true;

    if (!step.required) {
      if (step.type === "time_range") {
        const a = answers[step.dbKeys[0]];
        const b = answers[step.dbKeys[1]];
        return (!a && !b) || (a && b);
      }
      return true;
    }

    if (step.type === "text") return !!value && String(value).trim().length > 0;

    if (step.type === "number") {
      if (value === undefined || value === "") return false;
      const n = Number(value);
      if (Number.isNaN(n)) return false;
      if (step.min !== undefined && n < step.min) return false;
      if (step.max !== undefined && n > step.max) return false;
      return true;
    }

    if (step.type === "single_choice") return value !== undefined && value !== null && value !== "";
    if (step.type === "multi_choice") return Array.isArray(value) && value.length > 0;

    if (step.type === "time_range") {
      const a = answers[step.dbKeys[0]];
      const b = answers[step.dbKeys[1]];
      return !!a && !!b;
    }

    if (step.type === "slider") return value !== undefined && value !== "" && value !== null;

    if (step.type === "matrix") {
      const m = answers[step.dbKey] || {};
      return step.rows.every((r) => !!m[r.key]);
    }

    return true;
  };

  const next = async () => {
    if (!isValid()) {
      setTouched(true);
      return;
    }

    if (idx === steps.length - 1) {
      try {
        setSubmitting(true);
        await onSubmit(answers);
      } finally {
        setSubmitting(false);
      }
      return;
    }

    let j = idx + 1;
    while (j < steps.length && isSectionStep(steps[j])) j++;
    setIdx(Math.min(j, steps.length - 1));
  };

  const back = () => {
    let j = idx - 1;
    while (j > 0 && isSectionStep(steps[j])) j--;
    setIdx(Math.max(0, j));
  };

  const skip = () => {
    let j = idx + 1;
    while (j < steps.length && isSectionStep(steps[j])) j++;
    setIdx(Math.min(j, steps.length - 1));
  };

  const toggleMulti = (optVal) => {
    const arr = Array.isArray(value) ? value : [];
    const noneVal = step.noneValue;

    let nextArr = arr.includes(optVal) ? arr.filter((x) => x !== optVal) : [...arr, optVal];

    // none logic
    if (noneVal && optVal === noneVal && nextArr.includes(noneVal)) nextArr = [noneVal];
    if (noneVal && optVal !== noneVal) nextArr = nextArr.filter((x) => x !== noneVal);

    const max = step.maxSelect || 999;
    if (!arr.includes(optVal) && nextArr.length > max) return;

    setOne(step.dbKey, nextArr);
  };

  const progress = Math.round(((idx + 1) / steps.length) * 100);
  const tip = (step?.coachTip || COACH_TIPS[step?.dbKey] || "").trim();

  // --- Premium option card style (independent of CSS) ---
  const optionCard = (active) => ({
    width: "100%",
    textAlign: "left",
    padding: "14px 14px",
    borderRadius: 18,
    border: active ? "1px solid rgba(255,107,87,0.45)" : "1px solid rgba(0,0,0,0.10)",
    background: active
      ? "linear-gradient(180deg, rgba(255,107,87,0.10), rgba(255,138,91,0.08))"
      : "rgba(255,255,255,0.95)",
    cursor: "pointer",
    fontWeight: 900,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  });

  if (!step) return null;

  return (
    <div className="container">
      <div className="card" style={{ maxWidth: 460, padding: 16 }}>
        {/* Top bar */}
        <div className="topRow" style={{ marginBottom: 10 }}>
          <button className="smallBtn" onClick={back} disabled={idx === 0} type="button">
            Back
          </button>

          <div style={{ fontWeight: 1000 }}>{idx + 1}/{steps.length}</div>

          <button className="smallBtn" onClick={onLogout} type="button">
            Logout
          </button>
        </div>

        {/* Progress */}
        <div className="progressWrap" style={{ height: 10, marginBottom: 10 }}>
          <div className="progressBar" style={{ width: `${progress}%` }} />
        </div>

        {sectionName && <div className="sectionChip">📌 {sectionName}</div>}

        {/* Content */}
        <div
          ref={contentRef}
          style={{
            marginTop: 10,
            maxHeight: "64vh",
            overflowY: "auto",
            paddingBottom: 12,
          }}
        >
          {/* Title + badge */}
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
            <div className="hTitle">
              {step?.icon ? `${step.icon} ` : ""}{step?.title || ""}
            </div>

            <div
              className="pill"
              style={{
                borderColor: step.required ? "rgba(46,196,182,0.30)" : "rgba(255,107,87,0.22)",
                background: step.required ? "rgba(46,196,182,0.10)" : "rgba(255,107,87,0.10)",
                color: step.required ? "#0f766e" : "var(--text2)",
              }}
            >
              {step.required ? "Required" : "Optional"}
            </div>
          </div>

          {step?.subtitle && <div className="hSub">{step.subtitle}</div>}

          {/* TEXT */}
          {step.type === "text" && (
            <input
              className="input"
              placeholder={step.placeholder || ""}
              value={value || ""}
              onChange={(e) => setOne(step.dbKey, e.target.value)}
            />
          )}

          {/* NUMBER */}
          {step.type === "number" && (
            <>
              <input
                className="input"
                type="number"
                min={step.min}
                max={step.max}
                value={value ?? ""}
                onChange={(e) => setOne(step.dbKey, e.target.value)}
              />
              <div className="caption" style={{ marginTop: 8 }}>
                Range: {step.min}–{step.max}
              </div>
            </>
          )}

          {/* SINGLE CHOICE */}
          {step.type === "single_choice" && (
            <div style={{ display: "grid", gap: 12, marginTop: 12 }}>
              {step.options.map((opt) => {
                const active = value === opt.value;
                return (
                  <button
                    key={String(opt.value)}
                    type="button"
                    onClick={() => setOne(step.dbKey, opt.value)}
                    style={optionCard(active)}
                  >
                    <span style={{ lineHeight: 1.25 }}>{opt.label}</span>
                    <span className="pill">{active ? "✓" : ""}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* MULTI CHOICE */}
          {step.type === "multi_choice" && (
            <>
              <div style={{ display: "grid", gap: 12, marginTop: 12 }}>
                {step.options.map((opt) => {
                  const arr = Array.isArray(value) ? value : [];
                  const active = arr.includes(opt.value);
                  return (
                    <button
                      key={String(opt.value)}
                      type="button"
                      onClick={() => toggleMulti(opt.value)}
                      style={optionCard(active)}
                    >
                      <span style={{ lineHeight: 1.25 }}>{opt.label}</span>
                      <span className="pill">{active ? "✓" : ""}</span>
                    </button>
                  );
                })}
              </div>

              {!!step.maxSelect && (
                <div className="caption" style={{ marginTop: 10 }}>
                  Selected: {(Array.isArray(value) ? value.length : 0)} / {step.maxSelect}
                </div>
              )}
            </>
          )}

          {/* TIME RANGE */}
          {step.type === "time_range" && (
            <div style={{ display: "grid", gap: 12, marginTop: 12 }}>
              <div className="box">
                <div style={{ fontWeight: 1000, marginBottom: 8 }}>First meal</div>
                <input
                  className="input"
                  type="time"
                  value={answers[step.dbKeys[0]] || ""}
                  onChange={(e) => setOne(step.dbKeys[0], e.target.value)}
                />
              </div>

              <div className="box">
                <div style={{ fontWeight: 1000, marginBottom: 8 }}>Last meal</div>
                <input
                  className="input"
                  type="time"
                  value={answers[step.dbKeys[1]] || ""}
                  onChange={(e) => setOne(step.dbKeys[1], e.target.value)}
                />
              </div>

              <div className="caption">Tip: set both times, or leave both empty.</div>
            </div>
          )}

          {/* SLIDER */}
          {step.type === "slider" && (
            <div style={{ marginTop: 12 }}>
              <div className="box">
                <input
                  type="range"
                  min={step.min}
                  max={step.max}
                  step={step.step || 1}
                  value={value ?? step.min}
                  onChange={(e) => setOne(step.dbKey, e.target.value)}
                  style={{ width: "100%" }}
                />
                <div className="caption" style={{ marginTop: 10 }}>
                  Selected: <b>{value ?? step.min}</b> {step.unit || ""}
                </div>
              </div>
            </div>
          )}

          {/* MATRIX */}
          {step.type === "matrix" && (
            <div className="box" style={{ marginTop: 12 }}>
              <table className="matrixTable">
                <thead>
                  <tr>
                    <th>Item</th>
                    {step.columns.map((c) => (
                      <th key={c.value}>{c.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {step.rows.map((r) => {
                    const m = answers[step.dbKey] || {};
                    return (
                      <tr key={r.key}>
                        <td style={{ fontWeight: 900, color: "var(--text)" }}>{r.label}</td>
                        {step.columns.map((c) => (
                          <td key={c.value}>
                            <input
                              type="radio"
                              name={`m_${r.key}`}
                              checked={m[r.key] === c.value}
                              onChange={() => setOne(step.dbKey, { ...m, [r.key]: c.value })}
                            />
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Coach tip as soft card */}
          {tip && (
            <div
              style={{
                marginTop: 14,
                padding: 12,
                borderRadius: 18,
                border: "1px solid rgba(255,107,87,0.18)",
                background: "rgba(255,107,87,0.08)",
                fontWeight: 800,
                color: "rgba(26,26,26,0.70)",
                lineHeight: 1.45,
              }}
            >
              <b>Coach tip:</b> {tip}
            </div>
          )}

          {touched && !isValid() && (
            <div className="warn" style={{ marginTop: 12 }}>
              {validationMessage()}
            </div>
          )}
        </div>

        {/* Bottom actions */}
        <div style={{ marginTop: 12 }}>
          <button
            className="primaryBtn"
            onClick={next}
            disabled={submitting}
            type="button"
            style={{ opacity: submitting ? 0.75 : 1 }}
          >
            {submitting ? "Saving..." : idx === steps.length - 1 ? "Finish ✅" : "Next →"}
          </button>

          {!step.required && (
            <button className="ghostBtn" onClick={skip} type="button" style={{ width: "100%", marginTop: 10 }}>
              Skip
            </button>
          )}
        </div>
      </div>
    </div>
  );
}