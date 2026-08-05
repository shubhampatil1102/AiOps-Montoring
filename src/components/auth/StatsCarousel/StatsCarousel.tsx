import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import styles from "./StatsCarousel.module.css";

export interface StatItem {
  label: string;
  value: string;
}

interface StatsCarouselProps {
  items: StatItem[];
  intervalMs?: number;
}

// Rotates one glass stat card at a time. `items` is caller-supplied mock
// data today (see Login.tsx) — no live metrics endpoint backs this yet.
export default function StatsCarousel({ items, intervalMs = 7000 }: StatsCarouselProps) {
  const [index, setIndex] = useState(0);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    if (prefersReducedMotion || items.length <= 1) return;
    const timer = setInterval(() => setIndex((i) => (i + 1) % items.length), intervalMs);
    return () => clearInterval(timer);
  }, [items.length, intervalMs, prefersReducedMotion]);

  const current = items[index];
  if (!current) return null;

  return (
    <div className={styles.carousel}>
      <AnimatePresence mode="wait">
        <motion.div
          key={current.label}
          className={styles.card}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -14 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <span className={styles.value}>{current.value}</span>
          <span className={styles.label}>{current.label}</span>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
