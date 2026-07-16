export interface HealSuggestion {
  id: number;
  device_id: string;
  alert_type: string;
  reason: string;
  suggested_action: string;
  created_at: string | number;
  script: string;
  status?: string;
}

export interface HealTimelineEntry {
  job_id: string | number;
  device_id: string;
  script?: string;
  status: string;
  approval_status?: string;
  approval_user?: string;
  agent_message?: string;
  created_at?: string | number;
  started_at?: string | number;
  finished_at?: string | number;
  decision_time?: string | number;
  output?: string;
  error?: string;
}

export interface ScriptJob {
  id: number;
  device_id: string;
  script: string;
  status: "PENDING" | "RUNNING" | "SUCCESS" | "FAILED" | string;
  output?: string;
  error?: string;
  created_at: number;
  started_at?: number;
  finished_at?: number;
}

export interface ScriptLibraryItem {
  id: number;
  name: string;
  description?: string;
  script: string;
}

export interface HealRule {
  id: string;
  alertType: string;
  scriptName: string;
  script: string;
  autoEnabled: boolean;
  priority: number;
  source: "suggestion" | "library";
}

export interface RunScriptPayload {
  deviceId: string;
  script: string;
}
