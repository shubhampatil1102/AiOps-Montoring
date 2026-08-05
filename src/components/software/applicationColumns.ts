export type ApplicationSortKey =
  | "canonical_name"
  | "publisher"
  | "category"
  | "device_count"
  | "running_count"
  | "avg_health_score"
  | "cloud_status"
  | "recognition";

export type ApplicationColumnKey =
  | "publisher"
  | "category"
  | "device_count"
  | "running_count"
  | "avg_health_score"
  | "cloud_status"
  | "recognition";

export const APPLICATION_COLUMNS: Array<{ key: ApplicationColumnKey; label: string; sortKey: ApplicationSortKey }> = [
  { key: "publisher", label: "Publisher", sortKey: "publisher" },
  { key: "category", label: "Category", sortKey: "category" },
  { key: "device_count", label: "Devices", sortKey: "device_count" },
  { key: "running_count", label: "Running", sortKey: "running_count" },
  { key: "avg_health_score", label: "Health", sortKey: "avg_health_score" },
  { key: "cloud_status", label: "Cloud Status", sortKey: "cloud_status" },
  { key: "recognition", label: "Recognition", sortKey: "recognition" },
];
