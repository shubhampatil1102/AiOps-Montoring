import { API_URL } from "./config";
import type { MetricsHistoryPoint } from "@/types/dashboard";

export async function fetchMetricsHistory(minutes = 30) {
  const response = await fetch(
    `${API_URL}/metrics/history?minutes=${encodeURIComponent(minutes)}`
  );

  if (!response.ok) {
    throw new Error("Failed to fetch metrics history");
  }

  const data = await response.json();
  return Array.isArray(data) ? (data as MetricsHistoryPoint[]) : [];
}
