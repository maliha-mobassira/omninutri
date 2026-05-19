import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { chatRequest } from "../lib/backend";
import { saveMealFromChat } from "../lib/logging";

export default function Scan() {
  const nav = useNavigate();
  const [file, setFile] = useState(null);
  const [res, setRes] = useState(null);
  const [loading, setLoading] = useState(false);

  const analyze = async (overrideText, sendImage = true) => {
    setLoading(true);
    try {
      const out = await chatRequest({
        message: overrideText || "analyze this meal",
        imageFile: sendImage ? file : null,
      });

      setRes(out);

      if (out?.nutrition?.needs_clarification) return;

      await saveMealFromChat({
        chatRes: out,
        userMessage: overrideText || "scan",
        source: sendImage ? "image" : "text",
      });

      alert("✅ Saved to logs");
      nav("/dashboard");
    } catch (e) {
      alert("Scan failed: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const options = res?.ui?.options || [];

  return (
    <div className="panel">
      <h2 style={{ marginTop: 0 }}>Scan Meal</h2>

      <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0])} />

      <button className="primaryBtn" onClick={() => analyze()} disabled={!file || loading} style={{ marginTop: 12 }}>
        {loading ? "Analyzing..." : "Analyze"}
      </button>

      {res?.message && <pre style={{ whiteSpace: "pre-wrap", marginTop: 12 }}>{res.message}</pre>}

      {res?.nutrition?.needs_clarification && options.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <div className="note">Tap one option to confirm:</div>
          <div className="choiceGrid">
            {options.map((opt) => (
              <button
                key={opt}
                className="choiceBtn"
                onClick={() => analyze(`It is ${opt}. Quantity: 1 serving.`, false)}
              >
                <span>{opt}</span>
                <span className="pill">Confirm</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}