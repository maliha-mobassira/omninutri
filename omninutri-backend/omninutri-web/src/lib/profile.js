export function isProfileComplete(p) {
  if (!p) return false;
  const ageOk = Number(p.age) >= 10 && Number(p.age) <= 90;
  const heightOk = Number(p.height) >= 120 && Number(p.height) <= 220;
  const weightOk = Number(p.weight) >= 25 && Number(p.weight) <= 250;
  return ageOk && heightOk && weightOk && !!p.activity_level && !!p.goal && !!p.persona;
}

export const fmtTime = (t) => (t ? String(t).slice(0, 5) : "—");