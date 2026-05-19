import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

function NavBtn({ to, label }) {
  const loc = useLocation();
  const active = loc.pathname === to;

  return (
    <Link
      className={active ? "toggleActive" : "toggle"}
      to={to}
      style={{ textAlign: "center" }}
    >
      {label}
    </Link>
  );
}

export default function AppShell() {
  const nav = useNavigate();

  const logout = async () => {
    await supabase.auth.signOut();
    nav("/auth");
  };

  return (
    <div className="container">
      <div className="card">
        {/* App header (only here) */}
        <div className="topRow">
          <div className="brand">
            <h1>OmniNutri</h1>
            <p>Nutrition & Lifestyle</p>
          </div>

          <button className="smallBtn" onClick={logout} type="button">
            Logout
          </button>
        </div>

        {/* Nav (only here) */}
        <div className="toggleRow">
          <NavBtn to="/dashboard" label="🏠 Dashboard" />
          <NavBtn to="/chat" label="🤖 Assistant" />
          <NavBtn to="/reports" label="📊 Insights" />
        </div>

        {/* Page content */}
        <Outlet />
      </div>
    </div>
  );
}