import Donut from "@/components/charts/Donut";
import ChartCard from "../ChartCard";
import { getSeverity } from "@/utils/severity";
import type { Alert } from "@/types/dashboard";

const COLORS: Record<string, string> = {
  Critical: "#ef4444",
  Warning: "#f59e0b",
  Info: "#22c55e",
};

interface AlertsBySeverityChartProps {
  alerts: Alert[];
}

export default function AlertsBySeverityChart({
  alerts,
}: AlertsBySeverityChartProps) {
  const counts = { Critical: 0, Warning: 0, Info: 0 };

  alerts.forEach((alert) => {
    const { label } = getSeverity(alert.message);

    if (label === "CRITICAL") counts.Critical += 1;
    else if (label === "WARNING") counts.Warning += 1;
    else counts.Info += 1;
  });

  const data = Object.entries(counts).map(([name, value]) => ({
    name,
    value,
    color: COLORS[name],
  }));

  return (
    <ChartCard title="Alerts by Severity" subtitle="Breakdown of active alerts">
      <Donut data={data} emptyMessage="No alerts to summarize." />
    </ChartCard>
  );
}
