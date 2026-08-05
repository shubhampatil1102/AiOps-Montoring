import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { LoginTranslations } from "@/lib/i18n/translations/en";
import styles from "./HeroSection.module.css";

interface HeroSectionProps {
  t: LoginTranslations;
  stateIntervalMs?: number;
}

export default function HeroSection({ t, stateIntervalMs = 9000 }: HeroSectionProps) {
  const [stateIndex, setStateIndex] = useState(0);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    if (prefersReducedMotion || t.heroStates.length <= 1) return;
    const timer = setInterval(() => setStateIndex((i) => (i + 1) % t.heroStates.length), stateIntervalMs);
    return () => clearInterval(timer);
  }, [t.heroStates.length, stateIntervalMs, prefersReducedMotion]);

  return (
    <div className={styles.hero}>
      <AnimatePresence mode="wait">
        <motion.span
          key={t.heroStates[stateIndex]}
          className={styles.stateBadge}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6 }}
        >
          {t.heroStates[stateIndex]}
        </motion.span>
      </AnimatePresence>

      <h1 className={styles.title}>{t.heroTitle}</h1>

      <p className={styles.subtitle}>
        {t.heroSubtitleLines.map((line) => (
          <span key={line} className={styles.subtitleLine}>
            {line}
          </span>
        ))}
      </p>

      <p className={styles.description}>{t.heroDescription}</p>
    </div>
  );
}
