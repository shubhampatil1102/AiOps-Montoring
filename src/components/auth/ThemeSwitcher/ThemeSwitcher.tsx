import { Monitor, Moon, Sun } from "lucide-react";
import type { ThemeMode } from "@/lib/useColorSchemePreference";
import styles from "./ThemeSwitcher.module.css";

interface ThemeSwitcherProps {
  mode: ThemeMode;
  onChange: (mode: ThemeMode) => void;
}

const OPTIONS: { mode: ThemeMode; label: string; Icon: typeof Sun }[] = [
  { mode: "light", label: "Light", Icon: Sun },
  { mode: "dark", label: "Dark", Icon: Moon },
  { mode: "system", label: "System", Icon: Monitor },
];

export default function ThemeSwitcher({ mode, onChange }: ThemeSwitcherProps) {
  return (
    <div className={styles.switcher} role="group" aria-label="Theme">
      {OPTIONS.map(({ mode: optionMode, label, Icon }) => (
        <button
          key={optionMode}
          type="button"
          className={mode === optionMode ? styles.activeOption : styles.option}
          onClick={() => onChange(optionMode)}
          aria-pressed={mode === optionMode}
          title={label}
        >
          <Icon size={14} aria-hidden="true" />
          <span className={styles.srOnly}>{label}</span>
        </button>
      ))}
    </div>
  );
}
