export function todayISO() {
  const d = new Date();
  const tz = d.getTimezoneOffset() * 60000;
  return new Date(Date.now() - tz).toISOString().slice(0, 10);
}