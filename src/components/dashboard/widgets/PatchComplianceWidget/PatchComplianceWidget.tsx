import DashboardWidget from "@/components/dashboard/DashboardWidget";
import Donut, { type DonutDatum } from "@/components/charts/Donut";
import { usePatchSummary } from "@/hooks/usePatch";
import { statusColors } from "@/themes/colors";
import styles from "./PatchComplianceWidget.module.css";

export default function PatchComplianceWidget() {
  const { data: summary } = usePatchSummary();
  const upToDate = summary?.upToDate ?? 0;
  const pending = summary?.pending ?? 0;
  const failed = summary?.failed ?? 0;
  const activeJobs = summary?.activeJobs ?? 0;

  const donutData: DonutDatum[] = [
    { name: "Up to date", value: upToDate, color: statusColors.healthy },
    { name: "Pending", value: pending, color: statusColors.warning },
    { name: "Failed", value: failed, color: statusColors.critical },
  ].filter((item) => item.value > 0);

  return (
    <DashboardWidget
      title="Patch Compliance"
      subtitle="Windows Update status across the fleet"
      isEmpty={upToDate + pending + failed === 0}
      emptyMessage="No update scan data reported yet."
    >
      <div className={styles.layout}>
        <div className={styles.donutColumn}>
          <Donut data={donutData} outerRadius={60} innerRadius={36} showLabels={false} centerLabel="Devices" />
        </div>

        <div className={styles.statsColumn}>
          <StatRow label="Up to date" value={upToDate} color={statusColors.healthy} />
          <StatRow label="Pending updates" value={pending} color={statusColors.warning} />
          <StatRow label="Failed updates" value={failed} color={statusColors.critical} />
          <StatRow label="Devices patching now" value={activeJobs} color={statusColors.info} />
        </div>
      </div>
    </DashboardWidget>
  );
}

function StatRow({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className={styles.statRow}>
      <span className={styles.statDot} style={{ background: color }} />
      <span className={styles.statLabel}>{label}</span>
      <span className={styles.statValue}>{value}</span>
    </div>
  );
}
