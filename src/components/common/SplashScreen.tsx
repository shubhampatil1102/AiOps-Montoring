import { LayoutGrid } from "lucide-react";
import styles from "./SplashScreen.module.css";

interface SplashScreenProps {
  label?: string;
}

export default function SplashScreen({ label = "Loading..." }: SplashScreenProps) {
  return (
    <div className={styles.page}>
      <div className={styles.brandMark}>
        <LayoutGrid size={26} />
      </div>
      <div className={styles.brandName}>AiOps Console</div>
      <div className={styles.spinner} aria-hidden="true" />
      <div className={styles.label}>{label}</div>
    </div>
  );
}
