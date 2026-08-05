import { motion, useReducedMotion } from "framer-motion";
import styles from "./AnimatedBackground.module.css";

// Purely decorative — aria-hidden, and every animated layer respects
// prefers-reduced-motion via Framer Motion's useReducedMotion(). Built
// from this app's existing brand gradient (#6b63b5 -> #4b5af9, already
// used in Login.module.css) rather than a new palette.
export default function AnimatedBackground() {
  const prefersReducedMotion = useReducedMotion();

  const blobs = [
    { className: styles.blobOne, duration: 22 },
    { className: styles.blobTwo, duration: 28 },
    { className: styles.blobThree, duration: 34 },
  ];

  return (
    <div className={styles.background} aria-hidden="true">
      <div className={styles.baseGradient} />
      <div className={styles.gridOverlay} />

      {blobs.map((blob, index) => (
        <motion.div
          key={index}
          className={blob.className}
          animate={
            prefersReducedMotion
              ? undefined
              : {
                  x: [0, 40, -20, 0],
                  y: [0, -30, 20, 0],
                  scale: [1, 1.08, 0.96, 1],
                }
          }
          transition={{ duration: blob.duration, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}

      <div className={styles.vignette} />
    </div>
  );
}
