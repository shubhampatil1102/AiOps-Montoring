import DashboardWidget from "@/components/dashboard/DashboardWidget";
import RadialProgress from "@/components/charts/RadialProgress";
import Donut, { type DonutDatum } from "@/components/charts/Donut";
import { scoreToLevel } from "@/lib/intelligence/healthScoreEngine";
import { scoreToColor, statusColors } from "@/themes/colors";
import type { HardwareMap } from "@/types/dashboard";
import styles from "./FleetBatteryWidget.module.css";

interface FleetBatteryWidgetProps {
  hardware: HardwareMap;
  averageScore?: number;
}

const levelColor: Record<string, string> = {
  Healthy: statusColors.healthy,
  Good: statusColors.info,
  Warning: statusColors.warning,
  Critical: statusColors.critical,
};

export default function FleetBatteryWidget({ hardware, averageScore }: FleetBatteryWidgetProps) {
  const entries = Object.entries(hardware).filter(([, h]) => h.battery_health_percent !== undefined);

  const buckets: Record<string, number> = { Healthy: 0, Good: 0, Warning: 0, Critical: 0 };
  for (const [, h] of entries) {
    const level = scoreToLevel(Number(h.battery_health_percent));
    if (level === "Unknown") continue;
    buckets[level] = (buckets[level] ?? 0) + 1;
  }

  const donutData: DonutDatum[] = Object.entries(buckets)
    .filter(([, count]) => count > 0)
    .map(([level, count]) => ({ name: level, value: count, color: levelColor[level] }));

  const sortedByHealth = [...entries].sort(
    (a, b) => Number(a[1].battery_health_percent) - Number(b[1].battery_health_percent)
  );
  const worst = sortedByHealth.slice(0, 5);
  const best = [...sortedByHealth].reverse().slice(0, 5);

  return (
    <DashboardWidget
      title="Fleet Battery Health"
      subtitle="Average health, distribution, and outliers across the fleet"
      isEmpty={entries.length === 0}
      emptyMessage="No battery data reported yet."
    >
      <div className={styles.layout}>
        <div className={styles.ringColumn}>
          <RadialProgress value={averageScore ?? 0} label="Avg Health" color={scoreToColor(averageScore ?? 0)} size={110} />
        </div>

        <div className={styles.donutColumn}>
          <Donut data={donutData} outerRadius={60} innerRadius={36} centerLabel="Devices" />
        </div>

        <div className={styles.listColumn}>
          <div className={styles.listTitle}>Worst 5</div>
          {worst.map(([id, h]) => (
            <div key={id} className={styles.listRow}>
              <span className={styles.listId}>{id}</span>
              <span className={styles.listValue} style={{ color: statusColors.critical }}>
                {Number(h.battery_health_percent).toFixed(0)}%
              </span>
            </div>
          ))}
        </div>

        <div className={styles.listColumn}>
          <div className={styles.listTitle}>Best 5</div>
          {best.map(([id, h]) => (
            <div key={id} className={styles.listRow}>
              <span className={styles.listId}>{id}</span>
              <span className={styles.listValue} style={{ color: statusColors.healthy }}>
                {Number(h.battery_health_percent).toFixed(0)}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </DashboardWidget>
  );
}
