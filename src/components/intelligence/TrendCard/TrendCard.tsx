import DashboardWidget from "../../dashboard/DashboardWidget";
import Sparkline from "@/components/charts/Sparkline";
import type { TrendResult } from "@/lib/intelligence/types";
import styles from "./TrendCard.module.css";

interface TrendCardProps {
  title: string;
  subtitle?: string;
  trend: TrendResult;
  color?: string;
}

export default function TrendCard({
  title,
  subtitle,
  trend,
  color = "#2563eb",
}: TrendCardProps) {
  const arrow = trend.direction === "up" ? "↑" : trend.direction === "down" ? "↓" : "→";
  const changeText =
    trend.changePercent !== null
      ? `${arrow} ${Math.abs(trend.changePercent).toFixed(1)}%`
      : null;

  return (
    <DashboardWidget title={title} subtitle={subtitle}>
      <div className={styles.body}>
        {changeText && (
          <div className={`${styles.change} ${styles[trend.direction]}`}>
            {changeText}
          </div>
        )}

        {trend.movingAverage.length > 1 ? (
          <Sparkline data={trend.movingAverage} color={color} height={60} />
        ) : (
          <div className={styles.noData}>Not enough data for a trend yet.</div>
        )}
      </div>
    </DashboardWidget>
  );
}
