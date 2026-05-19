export async function chatRequest({ message, imageFile }) {
  const base = (import.meta.env.VITE_BACKEND_URL || "http://127.0.0.1:8000").replace(/\/$/, "");
  const form = new FormData();
  if (message !== undefined && message !== null) form.append("message", message);
  if (imageFile) form.append("image", imageFile);

  const res = await fetch(`${base}/chat`, { method: "POST", body: form });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}