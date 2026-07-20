import { Moon, Sun } from "lucide-react";
import PageHeader from "../layouts/PageHeader";
import DashboardWidget from "../components/dashboard/DashboardWidget";
import { useTheme } from "@/ThemeContext";
import styles from "./Settings.module.css";

export default function Settings() {
  const { theme, toggle } = useTheme();
  const isDark = theme?.name === "dark";

  function setTheme(target: "light" | "dark") {
    const wantsDark = target === "dark";
    if (wantsDark !== isDark) {
      toggle();
    }
  }

  return (
    <div className={styles.page}>
      <PageHeader title="Settings" description="Application preferences." />

      <DashboardWidget title="Appearance" subtitle="Choose how the console looks">
        <div className={styles.themeOptions}>
          <button
            type="button"
            className={`${styles.themeOption} ${!isDark ? styles.themeOptionActive : ""}`}
            onClick={() => setTheme("light")}
            aria-pressed={!isDark}
          >
            <Sun size={18} />
            Light
          </button>

          <button
            type="button"
            className={`${styles.themeOption} ${isDark ? styles.themeOptionActive : ""}`}
            onClick={() => setTheme("dark")}
            aria-pressed={isDark}
          >
            <Moon size={18} />
            Dark
          </button>
        </div>
      </DashboardWidget>
    </div>
  );
}
