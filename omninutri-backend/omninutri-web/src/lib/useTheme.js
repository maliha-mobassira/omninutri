import { useEffect } from "react";

export function useTheme(mode) {
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", mode); // "light" | "dark"
  }, [mode]);
}
