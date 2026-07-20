import { useQuery } from "@tanstack/react-query";
import {
  fetchMetricAggregate,
  fetchMetricAnomalies,
  fetchMetricBaseline,
  fetchMetricDefinitions,
  fetchMetricHistory,
  fetchMetricTrend,
  type AnalyticsGranularity,
  type AnalyticsRange,
} from "@/api/analytics";

export function useMetricDefinitions() {
  return useQuery({
    queryKey: ["analytics-metric-definitions"],
    queryFn: fetchMetricDefinitions,
    staleTime: 5 * 60 * 1000,
  });
}

export function useMetricHistory(deviceId: string, metric: string, range: AnalyticsRange = "1h") {
  return useQuery({
    queryKey: ["analytics-metric-history", deviceId, metric, range],
    queryFn: () => fetchMetricHistory(deviceId, metric, range),
    enabled: Boolean(deviceId && metric),
    refetchInterval: 30000,
  });
}

export function useMetricAggregate(
  deviceId: string,
  metric: string,
  granularity: AnalyticsGranularity = "hour",
  range: AnalyticsRange = "1d"
) {
  return useQuery({
    queryKey: ["analytics-metric-aggregate", deviceId, metric, granularity, range],
    queryFn: () => fetchMetricAggregate(deviceId, metric, granularity, range),
    enabled: Boolean(deviceId && metric),
  });
}

export function useMetricBaseline(deviceId: string, metric: string) {
  return useQuery({
    queryKey: ["analytics-metric-baseline", deviceId, metric],
    queryFn: () => fetchMetricBaseline(deviceId, metric),
    enabled: Boolean(deviceId && metric),
  });
}

export function useMetricAnomalies(deviceId: string, metric: string, range: AnalyticsRange = "1d") {
  return useQuery({
    queryKey: ["analytics-metric-anomalies", deviceId, metric, range],
    queryFn: () => fetchMetricAnomalies(deviceId, metric, range),
    enabled: Boolean(deviceId && metric),
  });
}

export function useMetricTrend(deviceId: string, metric: string, period: "week" | "month" = "week") {
  return useQuery({
    queryKey: ["analytics-metric-trend", deviceId, metric, period],
    queryFn: () => fetchMetricTrend(deviceId, metric, period),
    enabled: Boolean(deviceId && metric),
  });
}
