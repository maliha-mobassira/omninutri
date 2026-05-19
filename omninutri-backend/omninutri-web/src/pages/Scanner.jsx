import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

const BACKEND = import.meta.env.VITE_BACKEND_URL || "http://127.0.0.1:8000";

function todayISO() {
  const d = new Date();
  const tz = d.getTimezoneOffset() * 60000;
  return new Date(Date.now() - tz).toISOString().slice(0, 10);
}

async function chatScanRequest(imageFile) {
  const form = new FormData();
  form.append("message", "analyze");
  form.append("image", imageFile);

  const res = await fetch(`${BACKEND}/chat`, { method: "POST", body: form });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

function pickNutrition(out) {
  const n = out?.nutrition || {};
  const t = n?.totals || n;

  return {
    foodName: n.food_name || n.items?.[0]?.food_name || "Unknown",
    quantity: n.estimated_quantity || n.items?.[0]?.quantity || "",
    calories: Number(t.calories || 0),
    protein: Number(t.protein || t.protein_g || 0),
    fat: Number(t.fat || t.fat_g || 0),
    carbohydrates: Number(t.carbohydrates || t.carbs_g || 0),
    fiber: Number(t.fiber || t.fiber_g || 0),
    confidence: Number(n.confidence || 0),
    needsClarification: Boolean(n.needs_clarification),
  };
}

async function saveScanToDiary({ out, mealType }) {
  const { data: sessionData } = await supabase.auth.getSession();
  const user = sessionData?.session?.user;
  if (!user) throw new Error("Not logged in");

  const day = todayISO();
  const nut = pickNutrition(out);

  if (!nut.foodName || nut.foodName.toLowerCase().includes("unknown")) throw new Error("Food not detected clearly.");
  if (!Number.isFinite(nut.calories) || nut.calories <= 0) throw new Error("Calories not available.");
  if (nut.needsClarification) throw new Error("Needs clarification first.");

  const insertRow = {
    user_id: user.id,
    day,
    source: "image",
    user_message: `[scanner:${mealType}]`,
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

  const { error: upErr } = await supabase.from("daily_metrics").upsert(next, { onConflict: "user_id,day" });
  if (upErr) throw new Error(upErr.message);

  return { ok: true };
}

function MacroChip({ label, value }) {
  return (
    <div className="scanChip">
      <div className="scanChipLabel">{label}</div>
      <div className="scanChipVal">{value}</div>
    </div>
  );
}

export default function Scanner() {
  const nav = useNavigate();
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);

  const [cameraOk, setCameraOk] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [stream, setStream] = useState(null);

  const [previewUrl, setPreviewUrl] = useState(null);
  const [out, setOut] = useState(null);
  const [loading, setLoading] = useState(false);

  const [mealType, setMealType] = useState("Breakfast");
  const nut = useMemo(() => pickNutrition(out), [out]);

  useEffect(() => {
    let mounted = true;

    async function startCamera() {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error("Camera not supported in this browser.");
        }

        const s = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });

        if (!mounted) return;

        setStream(s);
        setCameraOk(true);
        setCameraError("");

        if (videoRef.current) {
          videoRef.current.srcObject = s;
          await videoRef.current.play();
        }
      } catch (e) {
        setCameraOk(false);
        setCameraError(e?.message || "Camera blocked");
      }
    }

    startCamera();

    return () => {
      mounted = false;
      try {
        if (stream) stream.getTracks().forEach((t) => t.stop());
      } catch {
        // no-op
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openUpload = () => fileInputRef.current?.click();

  const analyzeFile = async (file) => {
    if (!file) return;

    setOut(null);
    const localUrl = URL.createObjectURL(file);
    setPreviewUrl(localUrl);

    setLoading(true);
    try {
      const data = await chatScanRequest(file);
      setOut(data);
    } catch (e) {
      alert("Scan failed: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const captureFromVideo = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const v = videoRef.current;
    const c = canvasRef.current;

    c.width = v.videoWidth || 1280;
    c.height = v.videoHeight || 720;

    const ctx = c.getContext("2d");
    ctx.drawImage(v, 0, 0, c.width, c.height);

    c.toBlob(async (blob) => {
      if (!blob) return;
      const file = new File([blob], "scan.jpg", { type: "image/jpeg" });
      await analyzeFile(file);
    }, "image/jpeg", 0.92);
  };

  const addToDiary = async () => {
    try {
      setLoading(true);
      await saveScanToDiary({ out, mealType });
      alert("✅ Added to Food Diary");
      nav("/dashboard");
    } catch (e) {
      alert("Could not add: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const ringPct = Math.max(0, Math.min(100, Math.round((nut.calories / 800) * 100)));

  return (
    <div className="scanPageV2">
      {/* Top */}
      <div className="scanTopV2">
        <button className="scanCircleBtn" onClick={() => nav(-1)} title="Back">✕</button>
        <div className="scanTopTitleV2">Scan Food</div>
        <button className="scanCircleBtn" onClick={openUpload} title="Upload">⬆</button>
      </div>

      {/* Viewport */}
      <div className="scanViewportV2">
        {cameraOk ? (
          <video ref={videoRef} className="scanVideoV2" playsInline muted />
        ) : previewUrl ? (
          <img src={previewUrl} className="scanVideoV2" alt="preview" />
        ) : (
          <div className="scanFallbackCard">
            <div className="scanFallbackTitle">Camera not available</div>
            <div className="scanFallbackSub">
              {cameraError || "Use upload instead."}
            </div>
            <button className="primaryBtn" style={{ marginTop: 14 }} onClick={openUpload}>
              Upload Photo
            </button>
          </div>
        )}

        {/* Mask + frame */}
        <div className="scanMaskV2" />
        <div className="scanFrameV2">
          <div className="scanCorner tl" />
          <div className="scanCorner tr" />
          <div className="scanCorner bl" />
          <div className="scanCorner br" />
        </div>

        <div className="scanHintV2">Please align food with the scanner</div>

        {/* Capture */}
        <button
          className="scanCaptureV2"
          onClick={cameraOk ? captureFromVideo : openUpload}
          disabled={loading}
          title="Capture"
        >
          <span />
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          style={{ display: "none" }}
          onChange={(e) => analyzeFile(e.target.files?.[0])}
        />

        <canvas ref={canvasRef} style={{ display: "none" }} />
      </div>

      {/* Loading */}
      {loading && (
        <div className="scanLoadingV2">Analyzing…</div>
      )}

      {/* Bottom sheet */}
      {out && (
        <div className="scanSheetV2">
          <div className="scanHandleV2" />

          <div className="scanSheetTitleV2">
            {nut.foodName} {nut.quantity ? `(${nut.quantity})` : ""}
          </div>

          <div className="scanNutritionRowV2">
            <div
              className="scanRingV2"
              style={{
                background: `conic-gradient(var(--primary) ${ringPct}%, rgba(0,0,0,0.08) 0)`,
              }}
            >
              <div className="scanRingInnerV2">
                <div className="scanRingValV2">{nut.calories}</div>
                <div className="scanRingSubV2">kcal</div>
              </div>
            </div>

            <div className="scanChipsV2">
              <MacroChip label="Protein" value={`${nut.protein}g`} />
              <MacroChip label="Carbs" value={`${nut.carbohydrates}g`} />
              <MacroChip label="Fat" value={`${nut.fat}g`} />
              <MacroChip label="Fiber" value={`${nut.fiber}g`} />
            </div>
          </div>

          <div className="scanRowV2">
            <div className="scanRowLeftV2">Add Meal to Food Diary</div>
            <select className="scanSelectV2" value={mealType} onChange={(e) => setMealType(e.target.value)}>
              <option>Breakfast</option>
              <option>Lunch</option>
              <option>Dinner</option>
              <option>Snack</option>
            </select>
          </div>

          <button className="scanAddBtnV2" onClick={addToDiary} disabled={loading}>
            Add to Food Diary
          </button>
        </div>
      )}
    </div>
  );
}