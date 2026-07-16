import ErrorBoundary from "../common/ErrorBoundary";
import ErrorState from "../common/ErrorState";
import {
  CpuUsageChart,
  HealthPieChart,
  MemoryUsageChart,
} from "../dashboard/Charts";
import type { HealthSummary } from "@/types/dashboard";
import styles from "./AnalyticsSection.module.css";

export default function AnalyticsSection({
  healthy,
  warning,
  critical,
  offline,
}: HealthSummary) {
  return (
    <ErrorBoundary fallback={<ErrorState message="Unable to render analytics." />}>
      <section className={styles.analytics}>
        <CpuUsageChart />

        <div className={styles.bottomRow}>
          <HealthPieChart
            healthy={healthy}
            warning={warning}
            critical={critical}
            offline={offline}
          />

          <MemoryUsageChart />
        </div>
      </section>
    </ErrorBoundary>
  );
}
