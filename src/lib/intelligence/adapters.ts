/**
 * Adapters — the "normalized API layer." These are the only functions in
 * the framework that know about this app's actual data shapes
 * (MetricsHistoryPoint, HardwareMap, Device). They convert whatever
 * `useDashboardData`/`useMetricsHistory` already returns into the generic
 * shapes the engines consume. No new network requests, no new endpoints —
 * purely a client-side normalization step over existing hook output.
 */
import type { Device, HardwareMap, MetricsHistoryPoint } from "@/types/dashboard";
import type { AnalyticsHistoryPoint } from "@/api/analytics";
import type { TimeSeriesPoint } from "./types";

/** Fleet-average CPU/RAM history, as already returned by useMetricsHistory. */
export function adaptMetricsHistoryToSeries(
  history: MetricsHistoryPoint[],
  key: "cpu" | "ram"
): TimeSeriesPoint[] {
  return history.map((point) => ({
    time: Number(point.time),
    value: Number(point[key] || 0),
  }));
}

/** Current fleet-average of a live device metric (cpu/ram) — a snapshot, not a series. */
export function averageDeviceMetric(devices: Device[], key: "cpu" | "ram"): number {
  if (devices.length === 0) return 0;
  return (
    devices.reduce((sum, d) => sum + Number(d[key] || 0), 0) / devices.length
  );
}

/** Current fleet-average of a hardware snapshot metric (disk, battery_health_percent, ...). */
export function averageHardwareMetric(
  hardware: HardwareMap,
  key: "disk" | "battery_health_percent" | "cpu_temp"
): number | undefined {
  const values = Object.values(hardware)
    .map((h) => Number(h[key]))
    .filter((v) => !Number.isNaN(v));

  if (values.length === 0) return undefined;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

/**
 * Bridges the Historical Analytics Platform's generic per-device metric
 * history (any metric_name — disk, cpu_temp, battery_health_percent, ...)
 * into the same TimeSeriesPoint[] shape used above. This is the entire
 * integration surface for a future Intelligence Service backed by real
 * server-side history: fetch via useMetricHistory(), adapt here, run
 * through the existing pipeline unchanged.
 */
export function adaptAnalyticsHistoryToSeries(points: AnalyticsHistoryPoint[]): TimeSeriesPoint[] {
  return points.map((point) => ({
    time: Number(point.collected_at),
    value: Number(point.value),
  }));
}
