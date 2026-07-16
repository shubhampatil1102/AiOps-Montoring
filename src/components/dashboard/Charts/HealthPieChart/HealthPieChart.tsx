import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import EmptyState from "@/components/common/EmptyState";
import ChartCard from "../ChartCard";
import type { HealthSummary } from "@/types/dashboard";

const COLORS = [
  "#22c55e",
  "#f59e0b",
  "#ef4444",
  "#6b7280",
];

export default function HealthPieChart({
  healthy,
  warning,
  critical,
  offline,
}: HealthSummary) {
  const total = healthy + warning + critical + offline;

  const data = [
    { name: "Healthy", value: healthy },
    { name: "Warning", value: warning },
    { name: "Critical", value: critical },
    { name: "Offline", value: offline },
  ];

  return (
    <ChartCard
      title="Device Health"
      subtitle="Current environment status"
    >
      {total > 0 ? (
        <ResponsiveContainer
          width="100%"
          height="100%"
        >
          <PieChart>

            <Pie
              data={data}
              dataKey="value"
              outerRadius={110}
              label
            >

              {data.map((item, index) => (
                <Cell
                  key={item.name}
                  fill={COLORS[index]}
                />
              ))}

            </Pie>

            <Tooltip />

          </PieChart>
        </ResponsiveContainer>
      ) : (
        <EmptyState message="No device health data yet." />
      )}
    </ChartCard>
  );
}
