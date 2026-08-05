import { useEffect, useState } from "react";

export type ThemeMode = "light" | "dark" | "system";

const STORAGE_KEY = "nexops.login.theme";

function readStoredMode(): ThemeMode {
  if (typeof window === "undefined") return "system";
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return stored === "light" || stored === "dark" || stored === "system" ? stored : "system";
}

function systemPrefersDarkNow(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches;
}

// Self-contained to the login page — does not touch the dashboard's
// separate ThemeContext/Topbar toggle. Persists to localStorage and
// resolves "system" against the live OS preference (updates if the OS
// preference changes while the page is open).
export function useColorSchemePreference() {
  const [mode, setMode] = useState<ThemeMode>(readStoredMode);
  const [systemPrefersDark, setSystemPrefersDark] = useState(systemPrefersDarkNow);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const listener = () => setSystemPrefersDark(mediaQuery.matches);
    mediaQuery.addEventListener("change", listener);
    return () => mediaQuery.removeEventListener("change", listener);
  }, []);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, mode);
  }, [mode]);

  const resolvedTheme: "light" | "dark" = mode === "system" ? (systemPrefersDark ? "dark" : "light") : mode;

  return { mode, setMode, resolvedTheme };
}
