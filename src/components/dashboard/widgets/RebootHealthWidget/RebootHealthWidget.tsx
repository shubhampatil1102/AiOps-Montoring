import DashboardWidget from "@/components/dashboard/DashboardWidget";
import Donut, { type DonutDatum } from "@/components/charts/Donut";
import { useRebootFleetSummary } from "@/hooks/useReboot";
import { statusColors } from "@/themes/colors";
import styles from "./RebootHealthWidget.module.css";

function formatDays(value: number | null) {
  return value === null ? "--" : `${value.toFixed(1)}d`;
}

export default function RebootHealthWidget() {
  const { data: summary } = useRebootFleetSummary();
  const healthy = summary?.healthy ?? 0;
  const due = summary?.due ?? 0;
  const overdue = summary?.overdue ?? 0;

  const donutData: DonutDatum[] = [
    { name: "Healthy", value: healthy, color: statusColors.healthy },
    { name: "Due", value: due, color: statusColors.warning },
    { name: "Overdue", value: overdue, color: statusColors.critical },
  ].filter((item) => item.value > 0);

  return (
    <DashboardWidget
      title="Reboot Health"
      subtitle="Fleet-wide uptime and pending-restart status"
      isEmpty={healthy + due + overdue === 0}
      emptyMessage="No uptime data reported yet."
    >
      <div className={styles.layout}>
        <div className={styles.donutColumn}>
          <Donut data={donutData} outerRadius={60} innerRadius={36} showLabels={false} centerLabel="Devices" />
        </div>

        <div className={styles.statsColumn}>
          <StatRow label="Healthy" value={healthy} color={statusColors.healthy} />
          <StatRow label="Due" value={due} color={statusColors.warning} />
          <StatRow label="Overdue" value={overdue} color={statusColors.critical} />
          <StatRow label="Pending restart" value={summary?.pendingRestart ?? 0} color={statusColors.info} />
        </div>

        <div className={styles.statsColumn}>
          <StatRow label="Avg uptime" value={formatDays(summary?.avgUptimeDays ?? null)} color="#64748b" />
          <StatRow label="Highest uptime" value={formatDays(summary?.highestUptimeDays ?? null)} color="#64748b" />
          <StatRow label="Lowest uptime" value={formatDays(summary?.lowestUptimeDays ?? null)} color="#64748b" />
          <StatRow label="Recommended today" value={summary?.recommendedToday ?? 0} color={statusColors.warning} />
        </div>
      </div>
    </DashboardWidget>
  );
}

function StatRow({ label, value, color }: { label: string; value: number | string; color: string }) {
  return (
    <div className={styles.statRow}>
      <span className={styles.statDot} style={{ background: color }} />
      <span className={styles.statLabel}>{label}</span>
      <span className={styles.statValue}>{value}</span>
    </div>
  );
}
