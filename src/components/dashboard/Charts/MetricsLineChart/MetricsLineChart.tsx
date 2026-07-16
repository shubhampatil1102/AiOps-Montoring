import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { MetricsHistoryPoint } from "@/types/dashboard";

interface MetricsLineChartProps {
  data: MetricsHistoryPoint[];
  dataKey: "cpu" | "ram";
  color: string;
}

export default function MetricsLineChart({
  data,
  dataKey,
  color,
}: MetricsLineChartProps) {
  const chartData = data.map((item) => ({
    time: new Date(Number(item.time)).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }),
    cpu: Number(item.cpu || 0),
    ram: Number(item.ram || 0),
  }));

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="time" />
        <YAxis domain={[0, 100]} />
        <Tooltip />
        <Line
          dataKey={dataKey}
          stroke={color}
          strokeWidth={3}
          dot={false}
          type="monotone"
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
