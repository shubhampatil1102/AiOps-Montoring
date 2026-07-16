import ChartCard from "../ChartCard";
import MetricsLineChart from "../MetricsLineChart";
import EmptyState from "@/components/common/EmptyState";
import ErrorState from "@/components/common/ErrorState";
import Loading from "@/components/common/Loading";
import useMetricsHistory from "@/hooks/useMetricsHistory";

export default function MemoryUsageChart() {
  const { data = [], isLoading, isError } = useMetricsHistory();

  if (isLoading) {
    return (
      <ChartCard title="Memory Usage">
        <Loading />
      </ChartCard>
    );
  }

  if (isError) {
    return (
      <ChartCard title="Memory Usage">
        <ErrorState message="Unable to load memory usage." />
      </ChartCard>
    );
  }

  return (
    <ChartCard
      title="Memory Usage Trend"
      subtitle="Average memory utilisation"
    >
      {data.length > 0 ? (
        <MetricsLineChart
          data={data}
          dataKey="ram"
          color="#16a34a"
        />
      ) : (
        <EmptyState message="No memory history yet." />
      )}
    </ChartCard>
  );
}
