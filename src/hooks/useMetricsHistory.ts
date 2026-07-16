import { useQuery } from "@tanstack/react-query";
import { fetchMetricsHistory } from "@/api/metrics";
import type { MetricsHistoryPoint } from "@/types/dashboard";

export default function useMetricsHistory(minutes = 30) {
  return useQuery<MetricsHistoryPoint[]>({
    queryKey: ["metrics-history", minutes],
    queryFn: () => fetchMetricsHistory(minutes),
    refetchInterval: 5000,
  });
}
