import { ReactNode } from "react";
import styles from "./statcard.module.css";

type Props = {
  title: string;
  value: number | string;
  color?: string;
  subtitle?: string;

  icon: ReactNode;

  trend?: number;

  trendLabel?: string;

  description?: string;


};

export default function StatCard({ title, value, color = "#2563eb", subtitle, icon, trend, trendLabel, description }: Props) {
  return (
    <div className={styles.card}>

  <div className={styles.iconWrapper}>
    {icon}
  </div>

  <div className={styles.title}>
    {title}
  </div>

  <div
    className={styles.value}
    style={{ color }}
  >
    {value}
  </div>

  {trend !== undefined && (
    <div className={styles.trend}>
      <span className={trend >= 0 ? styles.up : styles.down}>
        {trend >= 0 ? "↑" : "↓"} {Math.abs(trend)}%
      </span>

      <span className={styles.trendLabel}>
        {trendLabel}
      </span>
    </div>
  )}

  {description && (
    <div className={styles.description}>
      {description}
    </div>
  )}

</div>
  );
}
