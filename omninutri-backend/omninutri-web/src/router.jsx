import { createBrowserRouter, Navigate } from "react-router-dom";

import Splash from "./pages/Splash";
import Auth from "./pages/Auth";
import Onboarding from "./pages/Onboarding";

import Dashboard from "./pages/Dashboard";
import Chat from "./pages/Chat";
import Reports from "./pages/Reports";

import AppShell from "./components/AppShell";
import Scanner from "./pages/Scanner";

export const router = createBrowserRouter([
  // Public routes
  { path: "/", element: <Splash /> },
  { path: "/auth", element: <Auth /> },
  { path: "/onboarding", element: <Onboarding /> },

  // App routes (single layout owner)
  {
    element: <AppShell />,
    children: [
      { path: "/dashboard", element: <Dashboard /> },
      { path: "/chat", element: <Chat /> },
      { path: "/reports", element: <Reports /> },

      // ✅ NEW: Scanner route
      { path: "/scanner", element: <Scanner /> },

      // Backward compatibility
      { path: "/scan", element: <Navigate to="/scanner" replace /> },
    ],
  },

  // Fallback
  { path: "*", element: <Navigate to="/" replace /> },
]);