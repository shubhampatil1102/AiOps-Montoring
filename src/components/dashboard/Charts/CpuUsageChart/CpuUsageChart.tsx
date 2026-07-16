import ChartCard from "../ChartCard";
import MetricsLineChart from "../MetricsLineChart";
import EmptyState from "@/components/common/EmptyState";
import ErrorState from "@/components/common/ErrorState";
import Loading from "@/components/common/Loading";
import useMetricsHistory from "@/hooks/useMetricsHistory";

export default function CpuUsageChart() {
  const { data = [], isLoading, isError } = useMetricsHistory();

  if (isLoading) {
    return (
      <ChartCard title="CPU Usage">
        <Loading />
      </ChartCard>
    );
  }

  if (isError) {
    return (
      <ChartCard title="CPU Usage">
        <ErrorState message="Unable to load CPU usage." />
      </ChartCard>
    );
  }

  return (
    <ChartCard
      title="CPU Usage Trend"
      subtitle="Average CPU utilisation"
    >
      {data.length > 0 ? (
        <MetricsLineChart
          data={data}
          dataKey="cpu"
          color="#2563eb"
        />
      ) : (
        <EmptyState message="No CPU history yet." />
      )}
    </ChartCard>
  );
}
