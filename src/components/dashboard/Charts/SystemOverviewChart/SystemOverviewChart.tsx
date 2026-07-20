import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import ChartCard from "../ChartCard";
import EmptyState from "@/components/common/EmptyState";
import ErrorState from "@/components/common/ErrorState";
import Loading from "@/components/common/Loading";
import useMetricsHistory from "@/hooks/useMetricsHistory";

export default function SystemOverviewChart() {
  const { data = [], isLoading, isError } = useMetricsHistory();

  if (isLoading) {
    return (
      <ChartCard title="System Overview">
        <Loading />
      </ChartCard>
    );
  }

  if (isError) {
    return (
      <ChartCard title="System Overview">
        <ErrorState message="Unable to load system overview." />
      </ChartCard>
    );
  }

  if (data.length === 0) {
    return (
      <ChartCard
        title="System Overview"
        subtitle="Average CPU vs RAM utilisation"
      >
        <EmptyState message="No usage history yet." />
      </ChartCard>
    );
  }

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
    <ChartCard
      title="System Overview"
      subtitle="Average CPU vs RAM utilisation"
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="time" />
          <YAxis domain={[0, 100]} />
          <Tooltip />
          <Legend />
          <Line
            dataKey="cpu"
            name="CPU %"
            stroke="#2563eb"
            strokeWidth={3}
            dot={false}
            type="monotone"
          />
          <Line
            dataKey="ram"
            name="RAM %"
            stroke="#f59e0b"
            strokeWidth={3}
            dot={false}
            type="monotone"
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
