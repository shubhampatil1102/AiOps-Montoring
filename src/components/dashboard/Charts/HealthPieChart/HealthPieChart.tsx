import Donut from "@/components/charts/Donut";
import ChartCard from "../ChartCard";
import type { HealthSummary } from "@/types/dashboard";

const COLORS = ["#22c55e", "#f59e0b", "#ef4444", "#6b7280"];

export default function HealthPieChart({
  healthy,
  warning,
  critical,
  offline,
}: HealthSummary) {
  const data = [
    { name: "Healthy", value: healthy, color: COLORS[0] },
    { name: "Warning", value: warning, color: COLORS[1] },
    { name: "Critical", value: critical, color: COLORS[2] },
    { name: "Offline", value: offline, color: COLORS[3] },
  ];

  return (
    <ChartCard title="Device Health" subtitle="Current environment status">
      <Donut data={data} emptyMessage="No device health data yet." />
    </ChartCard>
  );
}
