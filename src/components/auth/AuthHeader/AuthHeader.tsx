import { HelpCircle } from "lucide-react";
import packageJson from "../../../../package.json";
import ThemeSwitcher from "../ThemeSwitcher";
import LanguageSelector from "../LanguageSelector";
import type { ThemeMode } from "@/lib/useColorSchemePreference";
import type { LoginTranslations } from "@/lib/i18n/translations/en";
import styles from "./AuthHeader.module.css";

interface AuthHeaderProps {
  t: LoginTranslations;
  themeMode: ThemeMode;
  onThemeChange: (mode: ThemeMode) => void;
}

export default function AuthHeader({ t, themeMode, onThemeChange }: AuthHeaderProps) {
  return (
    <header className={styles.header}>
      <div className={styles.brand}>
        <div className={styles.logoMark} aria-hidden="true">
          N
        </div>
        <div className={styles.brandText}>
          <span className={styles.brandName}>{t.brandName}</span>
          <span className={styles.brandTagline}>{t.brandTagline}</span>
        </div>
      </div>

      <div className={styles.actions}>
        <ThemeSwitcher mode={themeMode} onChange={onThemeChange} />
        <LanguageSelector />
        <a href="#" className={styles.helpLink}>
          <HelpCircle size={14} aria-hidden="true" />
          {t.helpLabel}
        </a>
        <span className={styles.version}>v{packageJson.version}</span>
      </div>
    </header>
  );
}
