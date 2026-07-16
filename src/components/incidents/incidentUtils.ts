import type {
  Incident,
  IncidentAlert,
  IncidentResolutionEvent,
  IncidentSeverity,
  IncidentStatus,
} from "@/types/incident";

export function getSeverityVariant(severity: IncidentSeverity) {
  if (severity === "critical" || severity === "high") return "danger";
  if (severity === "medium") return "warning";
  return "info";
}

export function getStatusVariant(status: IncidentStatus) {
  if (status === "resolved") return "success";
  if (status === "in-progress") return "info";
  if (status === "pending") return "warning";
  return "danger";
}

export function formatStatus(status: string) {
  return status.replace("-", " ");
}

export function formatTime(value?: string | number) {
  return value ? new Date(Number(value)).toLocaleString() : "-";
}

export function formatAgo(value?: string | number) {
  if (!value) return "-";
  const seconds = Math.max(0, Math.floor((Date.now() - Number(value)) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function getAffectedDevices(incident: Incident) {
  return incident.device_id ? [incident.device_id] : [];
}

export function getLinkedAlerts(incident: Incident, alerts: IncidentAlert[]) {
  return alerts.filter((alert) =>
    alert.id === incident.device_id ||
    incident.id.includes(`-${alert.id}-`) ||
    Number(alert.time) === Number(incident.created_at)
  );
}

export function getRootCause(incident: Incident) {
  const text = `${incident.title} ${incident.description}`.toLowerCase();
  if (text.includes("cpu")) return "Sustained CPU pressure or process anomaly detected on the affected device.";
  if (text.includes("ram") || text.includes("memory")) return "Memory utilisation crossed the operating threshold.";
  if (text.includes("driver")) return "Driver health signal indicates an outdated or failing driver.";
  if (text.includes("service")) return "A required Windows service is stopped or repeatedly failing.";
  if (text.includes("update")) return "Windows update or patch compliance drift was detected.";
  if (text.includes("security")) return "Security control state requires review.";
  return "The alert pattern needs operator review to confirm the root cause.";
}

export function getResolutionHistory(incident: Incident): IncidentResolutionEvent[] {
  const createdAt = Number(incident.created_at);
  const events: IncidentResolutionEvent[] = [
    {
      id: `${incident.id}-created`,
      label: "Detected",
      detail: incident.description,
      time: createdAt,
    },
  ];

  if (incident.auto_remediation_available) {
    events.push({
      id: `${incident.id}-remediation`,
      label: "Auto remediation available",
      detail: "A linked remediation or AI suggestion exists for this incident.",
      time: Number(incident.updated_at || incident.created_at),
    });
  }

  if (incident.status === "in-progress" || incident.status === "pending") {
    events.push({
      id: `${incident.id}-acknowledged`,
      label: "Acknowledged",
      detail: "Incident is under review.",
      time: Number(incident.updated_at || incident.created_at),
    });
  }

  if (incident.status === "resolved") {
    events.push({
      id: `${incident.id}-resolved`,
      label: "Resolved",
      detail: "Incident was marked resolved.",
      time: Number(incident.updated_at || incident.created_at),
    });
  }

  return events;
}

export function exportIncidents(incidents: Incident[]) {
  const headers = [
    "id",
    "title",
    "severity",
    "status",
    "device",
    "type",
    "created_at",
    "auto_remediation_available",
  ];
  const rows = incidents.map((incident) => [
    incident.id,
    incident.title,
    incident.severity,
    incident.status,
    incident.device_id || "",
    incident.type,
    formatTime(incident.created_at),
    incident.auto_remediation_available ? "yes" : "no",
  ]);

  const csv = [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `incidents-${Date.now()}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
