import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { isProfileComplete } from "../lib/profile";

function OrangeMascot() {
  return (
    <svg
      viewBox="0 0 220 220"
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="xMidYMid meet"
      style={{ width: "100%", height: "100%", display: "block" }}
    >
      <defs>
        <radialGradient id="og" cx="35%" cy="25%" r="70%">
          <stop offset="0" stopColor="#FFD29A" />
          <stop offset="0.55" stopColor="#FF9A2F" />
          <stop offset="1" stopColor="#FF7A18" />
        </radialGradient>
        <filter id="sh" x="-40%" y="-40%" width="180%" height="180%">
          <feDropShadow dx="0" dy="10" stdDeviation="10" floodColor="#000" floodOpacity="0.22" />
        </filter>
      </defs>

      <g filter="url(#sh)">
        <circle cx="110" cy="120" r="70" fill="url(#og)" />
        <ellipse cx="88" cy="98" rx="16" ry="22" fill="#FFFFFF" opacity="0.35" />
        <ellipse cx="70" cy="120" rx="8" ry="12" fill="#FFFFFF" opacity="0.22" />

        <path d="M120 52 C140 40 164 48 168 70 C150 78 130 74 120 52Z" fill="#42D66B" />
        <path d="M114 56 C110 38 118 28 130 20" stroke="#2AB85A" strokeWidth="6" strokeLinecap="round" fill="none" />

        <circle cx="92" cy="120" r="7" fill="#0B1220" />
        <circle cx="128" cy="120" r="7" fill="#0B1220" />
        <path d="M98 142 C110 154 120 154 132 142" stroke="#0B1220" strokeWidth="8" strokeLinecap="round" fill="none" />
        <circle cx="78" cy="138" r="7" fill="#FF7AA2" opacity="0.55" />
        <circle cx="142" cy="138" r="7" fill="#FF7AA2" opacity="0.55" />
      </g>
    </svg>
  );
}

export default function Splash() {
  const nav = useNavigate();
  const [busy, setBusy] = useState(false);

  // No auto redirect — only on click
  const goNext = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const { data } = await supabase.auth.getSession();
      const session = data?.session;

      if (!session) return nav("/auth");

      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .maybeSingle();

      if (!isProfileComplete(profile)) return nav("/onboarding");

      nav("/dashboard");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="container" style={{ padding: 24 }}>
      <div className="card splashCard">
        <div className="splashBlobs" aria-hidden="true" />

        <div className="splashInner">
          {/* Mascot TOP */}
          <div className="mascotFrame" aria-hidden="true">
            <div className="mascotFloat">
              <div className="mascotSize">
                <OrangeMascot />
              </div>
            </div>
            <div className="mascotShadow" />
          </div>

          {/* Text under mascot */}
          <div className="splashKicker">Your AI Nutrition & Lifestyle Guide</div>

          <h1 className="splashTitle">OmniNutri</h1>

          <p className="splashSub">Track meals. Build habits. See progress.</p>

          {/* Small “spell-bound” chips (still clean) */}
          <div className="chipRow">
            <div className="chip">📷 Scan meals</div>
            <div className="chip">💧 Track water</div>
            <div className="chip">🎯 Personalized targets</div>
          </div>

          {/* Button under text */}
          <button className="primaryBtn splashBtn" type="button" onClick={goNext} disabled={busy}>
            {busy ? "Please wait…" : "Get Started"}
          </button>

        
        </div>

        <style>{`
          .splashCard{
            position: relative;
            overflow: hidden;
            max-width: 760px;
            padding: 22px;
          }

          /* keep everything centered and stacked */
          .splashInner{
            position: relative;
            z-index: 1;
            max-width: 560px;
            margin: 0 auto;
            text-align: center;
            display: grid;
            gap: 10px;
            justify-items: center;
          }

          /* mascot frame */
          .mascotFrame{
            width: min(520px, 100%);
            height: clamp(220px, 34vw, 300px);
            border-radius: 30px;
            border: 1px solid var(--border);
            background: linear-gradient(135deg,
              rgba(255,107,87,0.10),
              rgba(46,196,182,0.08)
            );
            display: grid;
            place-items: center;
            position: relative;
          }

          /* responsive mascot size that always stays centered */
          .mascotSize{
            width: clamp(135px, 24vw, 190px);
            height: clamp(135px, 24vw, 190px);
            display: grid;
            place-items: center;
          }

          .mascotFloat{
            animation: floaty 1.8s ease-in-out infinite;
            transform-origin: 50% 80%;
            pointer-events: none;
          }

          .mascotShadow{
            position: absolute;
            bottom: 70px;
            left: 50%;
            transform: translateX(-50%);
            width: 150px;
            height: 18px;
            border-radius: 999px;
            background: rgba(0,0,0,0.12);
            filter: blur(10px);
            animation: shadowPulse 1.8s ease-in-out infinite;
            pointer-events: none;
          }

          /* premium text (use Inter here to avoid “artificial” Poppins feel) */
          .splashKicker{
            margin-top: 2px;
            font-weight: 800;
            color: var(--text2);
            font-size: 14px;
            font-family: var(--font-body);
          }

          .splashTitle{
            margin: 0;
            font-size: clamp(42px, 8vw, 60px);
            line-height: 1.02;
            letter-spacing: -1px;
            font-weight: 900;
            color: var(--text);
            font-family: var(--font-body);
          }

          .splashSub{
            margin: 0;
            font-size: 15px;
            line-height: 1.55;
            font-weight: 700;
            color: rgba(26,26,26,0.62);
            font-family: var(--font-body);
          }

          .chipRow{
            margin-top: 4px;
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
            justify-content: center;
          }
          .chip{
            padding: 8px 12px;
            border-radius: 999px;
            border: 1px solid rgba(0,0,0,0.10);
            background: rgba(255,255,255,0.75);
            font-weight: 900;
            font-size: 12px;
            color: var(--text2);
          }

          .splashBtn{
            margin-top: 6px;
            width: min(520px, 100%);
            height: 62px;
            font-size: 17px;
          }

          /* Decorative blobs */
          .splashBlobs{
            position:absolute;
            inset: -180px;
            background:
              radial-gradient(520px 320px at 20% 20%, rgba(255,107,87,0.12), transparent 62%),
              radial-gradient(520px 340px at 80% 18%, rgba(255,138,91,0.10), transparent 60%),
              radial-gradient(520px 360px at 55% 85%, rgba(46,196,182,0.08), transparent 66%);
            pointer-events:none;
          }

          @keyframes floaty {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-10px); }
          }
          @keyframes shadowPulse {
            0%, 100% { transform: translateX(-50%) scale(1); opacity: 0.12; }
            50% { transform: translateX(-50%) scale(0.86); opacity: 0.08; }
          }

          /* mobile padding tweak */
          @media (max-width: 520px){
            .splashCard{ padding: 16px; border-radius: 28px; }
            .mascotFrame{ border-radius: 26px; }
          }
        `}</style>
      </div>
    </div>
  );
}