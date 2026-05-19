import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { isProfileComplete } from "../lib/profile";

// client-side password generator (safe + fast)
function generateStrongPassword(length = 16) {
  const chars =
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*_-+=";
  const arr = new Uint32Array(length);
  crypto.getRandomValues(arr);
  let out = "";
  for (let i = 0; i < length; i++) out += chars[arr[i] % chars.length];
  return out;
}

export default function Auth() {
  const nav = useNavigate();

  const [mode, setMode] = useState("login"); // login | signup
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);

  const [info, setInfo] = useState("");
  const [error, setError] = useState("");

  const clearMsgs = () => {
    setInfo("");
    setError("");
  };

  const routeAfterLogin = async () => {
    const { data } = await supabase.auth.getSession();
    const session = data?.session;
    if (!session) return nav("/auth");

    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", session.user.id)
      .maybeSingle();

    if (!isProfileComplete(profile)) return nav("/onboarding");
    return nav("/dashboard"); // match your router
  };

  // If user returns from Google OAuth, session exists -> route immediately
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data?.session) routeAfterLogin();
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) routeAfterLogin();
    });

    return () => sub.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signup = async (e) => {
    e.preventDefault();
    clearMsgs();

    const { error } = await supabase.auth.signUp({ email, password });
    if (error) return setError(error.message);

    setInfo("Account created. Check your email to verify, then login.");
  };

  const login = async (e) => {
    e.preventDefault();
    clearMsgs();

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return setError(error.message);

    await routeAfterLogin();
  };

  const forgotPassword = async () => {
    clearMsgs();
    if (!email) return setInfo("Enter your email first.");

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    });

    if (error) return setError(error.message);
    setInfo("Password reset email sent.");
  };

  const resendVerification = async () => {
    clearMsgs();
    if (!email) return setInfo("Enter your email first.");

    const { error } = await supabase.auth.resend({ type: "signup", email });
    if (error) return setError(error.message);

    setInfo("Verification email resent.");
  };

  const continueWithGoogle = async () => {
    clearMsgs();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth` },
    });
    if (error) setError(error.message);
  };

  const canSubmit = useMemo(() => {
    return email.trim().length > 3 && password.length >= 6;
  }, [email, password]);

  return (
    <div className="container">
      <div className="card" style={{ maxWidth: 420, padding: 18 }}>
        <div className="brand" style={{ marginBottom: 10 }}>
          <h1 style={{ margin: 0, fontSize: 30, letterSpacing: "-0.6px" }}>OmniNutri</h1>
          <p style={{ margin: "6px 0 0" }}>Your AI Nutrition & Lifestyle Guide</p>
        </div>

        <div className="toggleRow" style={{ margin: "10px 0 10px" }}>
          <button
            className={mode === "login" ? "toggleActive" : "toggle"}
            onClick={() => setMode("login")}
            type="button"
          >
            Login
          </button>
          <button
            className={mode === "signup" ? "toggleActive" : "toggle"}
            onClick={() => setMode("signup")}
            type="button"
          >
            Signup
          </button>
        </div>

        <form onSubmit={mode === "login" ? login : signup}>
          {/* Email */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontWeight: 900, fontSize: 13, color: "var(--text2)", marginBottom: 8 }}>
              Email
            </div>
            <input
              className="input"
              type="email"
              placeholder="name@gmail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </div>

          {/* Password */}
          <div style={{ marginBottom: 6 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", marginBottom: 8 }}>
              <div style={{ fontWeight: 900, fontSize: 13, color: "var(--text2)" }}>
                Password
              </div>

              <div style={{ display: "flex", gap: 8 }}>
                {mode === "signup" && (
                  <button
                    type="button"
                    className="smallBtn"
                    onClick={() => setPassword(generateStrongPassword(16))}
                    style={{ padding: "6px 12px", borderRadius: 999, fontSize: 12, lineHeight: "14px" }}
                  >
                    Generate
                  </button>
                )}

                <button
                  type="button"
                  className="smallBtn"
                  onClick={() => setShowPw((s) => !s)}
                  style={{ padding: "6px 12px", borderRadius: 999, fontSize: 12, lineHeight: "14px" }}
                >
                  {showPw ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            <input
              className="input"
              type={showPw ? "text" : "password"}
              placeholder={mode === "signup" ? "Choose a strong password (6+ chars)" : "Your password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
            />

            {mode === "signup" && (
              <div className="caption" style={{ marginTop: 8 }}>
                Tip: Use 10+ characters. You can generate one and save it.
              </div>
            )}
          </div>

          <button
            className="primaryBtn"
            type="submit"
            disabled={!canSubmit}
            style={{ marginTop: 12, opacity: canSubmit ? 1 : 0.6 }}
          >
            {mode === "login" ? "Login" : "Create Account"}
          </button>
        </form>

        {/* Google button UNDER main login/create button */}
        <button
          type="button"
          className="ghostBtn"
          onClick={continueWithGoogle}
          style={{ width: "100%", height: 52, marginTop: 12 }}
        >
          Continue with Google
        </button>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
            gap: 10,
            marginTop: 12,
          }}
        >
          <button type="button" className="smallBtn" onClick={forgotPassword}>
            Forgot password
          </button>
          <button type="button" className="smallBtn" onClick={resendVerification}>
            Resend verification
          </button>
        </div>

        {error && <div className="warn">{error}</div>}

        {info && (
          <div
            style={{
              marginTop: 12,
              padding: 12,
              borderRadius: 16,
              border: "1px solid var(--border)",
              background: "rgba(255,255,255,0.85)",
              color: "var(--text2)",
              fontWeight: 800,
              fontSize: 13,
            }}
          >
            {info}
          </div>
        )}
      </div>
    </div>
  );
}