import { useEffect, useRef, useState } from "react";
import { Check, Globe } from "lucide-react";
import { LANGUAGE_OPTIONS } from "@/lib/i18n/languages";
import styles from "./LanguageSelector.module.css";

// Self-contained — only "en" has real strings (useTranslation.ts), every
// other option is real UI but marked "Coming soon" rather than silently
// doing nothing when picked.
export default function LanguageSelector() {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState("en");
  const wrapperRef = useRef<HTMLDivElement>(null);

  const selectedOption = LANGUAGE_OPTIONS.find((l) => l.code === selected) ?? LANGUAGE_OPTIONS[0];

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div className={styles.wrapper} ref={wrapperRef}>
      <button
        type="button"
        className={styles.trigger}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Language"
      >
        <Globe size={14} aria-hidden="true" />
        <span>{selectedOption.label}</span>
      </button>

      {open && (
        <ul className={styles.menu} role="listbox" aria-label="Select language">
          {LANGUAGE_OPTIONS.map((lang) => (
            <li key={lang.code}>
              <button
                type="button"
                role="option"
                aria-selected={selected === lang.code}
                aria-disabled={lang.comingSoon}
                className={styles.menuItem}
                onClick={() => {
                  if (lang.comingSoon) return;
                  setSelected(lang.code);
                  setOpen(false);
                }}
              >
                <span>{lang.nativeLabel}</span>
                <span className={styles.menuItemMeta}>
                  {selected === lang.code && <Check size={14} aria-hidden="true" />}
                  {lang.comingSoon && <span className={styles.comingSoon}>Coming soon</span>}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
