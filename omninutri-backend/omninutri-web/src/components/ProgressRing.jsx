export default function ProgressRing({
  size = 140,
  stroke = 14,
  percent = 60,          // 0–100
  label = "Calories left",
  main = "0",
  sub = "",
  colorA = "var(--primary)",
  colorB = "var(--primary2)",
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(100, Number(percent || 0)));
  const offset = c - (p / 100) * c;
  const gradId = `g_${Math.random().toString(16).slice(2)}`;

  return (
    <div style={{ display: "grid", placeItems: "center" }}>
      <div style={{ position: "relative", width: size, height: size }}>
        <svg width={size} height={size}>
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor={colorA} />
              <stop offset="1" stopColor={colorB} />
            </linearGradient>
            <filter id={`${gradId}_shadow`} x="-40%" y="-40%" width="180%" height="180%">
              <feDropShadow dx="0" dy="6" stdDeviation="6" floodColor="#000" floodOpacity="0.10" />
            </filter>
          </defs>

          {/* track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke="rgba(15,23,42,0.10)"
            strokeWidth={stroke}
            fill="none"
          />

          {/* progress */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke={`url(#${gradId})`}
            strokeWidth={stroke}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={offset}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
            filter={`url(#${gradId}_shadow)`}
          />
        </svg>

        {/* center text */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "grid",
            placeItems: "center",
            textAlign: "center",
            padding: 10,
          }}
        >
          <div style={{ color: "var(--muted)", fontWeight: 900, fontSize: 12 }}>{label}</div>
          <div style={{ fontSize: 28, fontWeight: 1200, lineHeight: 1.05 }}>{main}</div>
          {sub ? <div style={{ color: "var(--muted)", fontWeight: 900, fontSize: 12 }}>{sub}</div> : null}
        </div>
      </div>
    </div>
  );
}