import DashboardWidget from "../../DashboardWidget";
import RadialProgress from "@/components/charts/RadialProgress";
import { calculateHealthScore } from "@/lib/intelligence/healthScoreEngine";
import { scoreToColor, statusColors } from "@/themes/colors";
import styles from "./OrgHealthCard.module.css";

interface OrgHealthCardProps {
  healthy: number;
  warning: number;
  critical: number;
  offline: number;
  lastUpdated?: number;
}

export default function OrgHealthCard({
  healthy,
  warning,
  critical,
  offline,
  lastUpdated,
}: OrgHealthCardProps) {
  const total = healthy + warning + critical + offline;

  // Weighted composite via the shared Health Score Engine: healthy devices
  // count fully, warning devices partially, critical devices barely,
  // offline devices contribute nothing (unreachable is not healthy).
  // Same formula as before, now the framework's single source of truth.
  const { score } = calculateHealthScore([
    { label: "healthy", value: 100, weight: healthy },
    { label: "warning", value: 60, weight: warning },
    { label: "critical", value: 20, weight: critical },
    { label: "offline", value: 0, weight: offline },
  ]);

  return (
    <DashboardWidget
      title="Organization Health"
      subtitle="Composite score across all managed devices"
      isEmpty={total === 0}
      emptyMessage="No devices reporting yet."
      lastUpdated={lastUpdated}
    >
      <div className={styles.layout}>
        <RadialProgress
          value={score}
          label="Health Score"
          color={scoreToColor(score)}
          size={140}
        />

        <div className={styles.breakdown}>
          <div className={styles.row}>
            <span
              className={styles.dot}
              style={{ background: statusColors.healthy }}
            />
            Healthy <strong>{healthy}</strong>
          </div>

          <div className={styles.row}>
            <span
              className={styles.dot}
              style={{ background: statusColors.warning }}
            />
            Warning <strong>{warning}</strong>
          </div>

          <div className={styles.row}>
            <span
              className={styles.dot}
              style={{ background: statusColors.critical }}
            />
            Critical <strong>{critical}</strong>
          </div>

          <div className={styles.row}>
            <span
              className={styles.dot}
              style={{ background: statusColors.offline }}
            />
            Offline <strong>{offline}</strong>
          </div>
        </div>
      </div>
    </DashboardWidget>
  );
}
