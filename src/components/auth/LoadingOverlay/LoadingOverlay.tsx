import { AnimatePresence, motion } from "framer-motion";
import styles from "./LoadingOverlay.module.css";

interface LoadingOverlayProps {
  isVisible: boolean;
  stages: string[];
  stageIndex: number;
  theme: "light" | "dark";
}

// No spinner, by design (brief's explicit ask) — staged text + an
// animated progress bar instead. The stages are a loading narrative
// driven by a timer while the real login() call is in flight (see
// Login.tsx) — not fabricated backend telemetry.
export default function LoadingOverlay({ isVisible, stages, stageIndex, theme }: LoadingOverlayProps) {
  const progressPercent = stages.length > 0 ? ((stageIndex + 1) / stages.length) * 100 : 0;
  const currentStage = stages[stageIndex] ?? stages[0];

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className={styles.overlay}
          data-theme={theme}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          role="status"
          aria-live="polite"
        >
          <AnimatePresence mode="wait">
            <motion.span
              key={currentStage}
              className={styles.stageText}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.3 }}
            >
              {currentStage}
            </motion.span>
          </AnimatePresence>

          <div className={styles.progressTrack}>
            <motion.div
              className={styles.progressFill}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
