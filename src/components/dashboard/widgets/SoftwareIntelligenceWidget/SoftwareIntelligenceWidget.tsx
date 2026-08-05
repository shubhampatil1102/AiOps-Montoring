import DashboardWidget from "@/components/dashboard/DashboardWidget";
import Donut, { type DonutDatum } from "@/components/charts/Donut";
import { useApplicationSummary } from "@/hooks/useApplications";
import { useCloudIncidents } from "@/hooks/useCloudServices";
import { statusColors } from "@/themes/colors";
import styles from "./SoftwareIntelligenceWidget.module.css";

export default function SoftwareIntelligenceWidget() {
  const { data: summary } = useApplicationSummary();
  const { data: incidents } = useCloudIncidents();

  const healthy = summary?.healthy ?? 0;
  const warning = summary?.warning ?? 0;
  const critical = summary?.critical ?? 0;
  const topCpu = summary?.topCpu?.[0];
  const topMemory = summary?.topMemory?.[0];

  const donutData: DonutDatum[] = [
    { name: "Healthy", value: healthy, color: statusColors.healthy },
    { name: "Warning", value: warning, color: statusColors.warning },
    { name: "Critical", value: critical, color: statusColors.critical },
  ].filter((item) => item.value > 0);

  return (
    <DashboardWidget
      title="Software Intelligence"
      subtitle="Discovered applications, health, and top resource consumers"
      isEmpty={healthy + warning + critical === 0}
      emptyMessage="No application health data reported yet."
    >
      <div className={styles.layout}>
        <div className={styles.donutColumn}>
          <Donut data={donutData} outerRadius={60} innerRadius={36} showLabels={false} centerLabel="Apps" />
        </div>

        <div className={styles.statsColumn}>
          <StatRow label="Installed applications" value={summary?.installedApplications ?? 0} color={statusColors.info} />
          <StatRow label="Healthy" value={healthy} color={statusColors.healthy} />
          <StatRow label="Warning" value={warning} color={statusColors.warning} />
          <StatRow label="Critical" value={critical} color={statusColors.critical} />
        </div>

        <div className={styles.statsColumn}>
          <StatRow
            label="Top CPU consumer"
            value={topCpu ? `${topCpu.process_name} (${topCpu.cpu_percent}%)` : "--"}
            color={statusColors.warning}
          />
          <StatRow
            label="Top memory consumer"
            value={topMemory ? `${topMemory.process_name} (${topMemory.memory_mb} MB)` : "--"}
            color={statusColors.warning}
          />
          <StatRow label="Active cloud incidents" value={incidents?.length ?? 0} color={statusColors.critical} />
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
