import { motion, useReducedMotion } from "framer-motion";
import styles from "./SystemStatusPill.module.css";

interface SystemStatusPillProps {
  label: string;
}

// Mock status today — no live system-status endpoint exists in this app
// yet. The prop shape lets a real endpoint replace this value later
// without changing how the pill renders.
export default function SystemStatusPill({ label }: SystemStatusPillProps) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <div className={styles.pill}>
      <motion.span
        className={styles.dot}
        animate={prefersReducedMotion ? undefined : { opacity: [1, 0.35, 1] }}
        transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
      />
      {label}
    </div>
  );
}
