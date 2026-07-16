export type IncidentSeverity = "critical" | "high" | "medium" | "low";
export type IncidentStatus = "open" | "pending" | "in-progress" | "resolved";

export interface Incident {
  id: string;
  title: string;
  description: string;
  type: "security" | "update" | "service" | "driver" | "performance" | "other";
  severity: IncidentSeverity;
  status: IncidentStatus;
  device_id?: string;
  created_at: number | string;
  updated_at?: number | string;
  action_required?: boolean;
  auto_remediation_available?: boolean;
}

export interface IncidentAlert {
  id: string;
  message: string;
  time: number;
  acknowledged?: boolean;
  resolved?: boolean;
  suggestion_id?: number | null;
  auto_healed?: boolean;
}

export interface IncidentNote {
  id: string;
  incidentId: string;
  text: string;
  author: string;
  createdAt: number;
}

export interface IncidentResolutionEvent {
  id: string;
  label: string;
  detail: string;
  time: number;
}
