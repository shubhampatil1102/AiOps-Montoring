export interface Application {
  id: number;
  canonical_name: string;
  publisher?: string;
  category: string;
  plugin_id?: string | null;
  cloud_provider?: string | null;
  created_at: number;
  updated_at: number;
  device_count?: number;
  running_count?: number;
  avg_health_score?: number | null;
  cloud_status?: CloudProviderStatusValue | null;
}

export interface ApplicationDetail extends Application {
  deviceCount: number;
  runningCount: number;
  avgHealthScore: number | null;
  unsignedProcessCount: number;
}

export interface ApplicationDeviceBreakdown {
  device_id: string;
  state?: string;
  last_seen?: number;
  version?: string;
  install_date?: number;
  install_location?: string;
  architecture?: string;
  uninstall_command?: string;
  product_code?: string;
  inventory_last_seen?: number;
  health_score?: number | null;
  level?: string | null;
  is_running: boolean;
  cpu_percent?: number | null;
  memory_mb?: number | null;
}

export interface ApplicationInsights {
  mostInstalled: Array<{ id: number; canonical_name: string; category: string; device_count: number }>;
  mostVersionChanged: Array<{ id: number; canonical_name: string; change_count: number }>;
  mostServiceRestarts: Array<{ id: number; canonical_name: string; total_restarts: number }>;
  recentlyInstalled: Array<{ id: number; application_id: number; canonical_name: string; detail?: string; occurred_at: number }>;
  unsignedSoftware: Array<{ device_id: string; process_name: string; application_id: number | null; canonical_name: string | null }>;
  topCpu: Array<{ device_id: string; process_name: string; cpu_percent: number }>;
  topMemory: Array<{ device_id: string; process_name: string; memory_mb: number }>;
  publisherBreakdown: Array<{ publisher: string; application_count: number; device_count: number }>;
  categoryBreakdown: Array<{ category: string; application_count: number; device_count: number }>;
}

export interface InstalledApplication {
  id: number;
  device_id: string;
  application_id: number;
  display_name: string;
  version?: string;
  publisher?: string;
  install_date?: number;
  install_location?: string;
  architecture?: string;
  estimated_size_kb?: number;
  install_source: string;
  product_code?: string;
  uninstall_command?: string;
  first_seen_at: number;
  last_seen_at: number;
  removed_at?: number | null;
  canonical_name: string;
  category: string;
  plugin_id?: string | null;
  cloud_provider?: string | null;
}

export interface ApplicationProcess {
  id: number;
  device_id: string;
  application_id?: number | null;
  pid: number;
  parent_pid?: number;
  process_name: string;
  exe_path?: string;
  cpu_percent?: number | null;
  memory_mb?: number;
  threads?: number;
  handles?: number;
  start_time?: number;
  owner?: string;
  responding?: boolean;
  window_title?: string;
  signed?: boolean;
  publisher?: string;
  cert_issuer?: string | null;
  cert_expires_at?: number | null;
  cert_thumbprint?: string | null;
  collected_at: number;
}

export interface ApplicationHealth {
  device_id: string;
  application_id: number;
  health_score: number;
  level: string;
  breakdown: Record<string, number>;
  updated_at: number;
}

export interface ApplicationServiceStatus {
  device_id: string;
  application_id: number;
  service_name: string;
  display_name?: string;
  status?: string;
  startup_type?: string;
  restart_count: number;
  logon_account?: string;
  updated_at: number;
}

export interface ApplicationHistoryEntry {
  id: number;
  device_id: string;
  application_id?: number | null;
  event_type: string;
  detail?: string;
  occurred_at: number;
}

export interface ApplicationSummary {
  installedApplications: number;
  healthy: number;
  warning: number;
  critical: number;
  topCpu: Array<{ device_id: string; process_name: string; cpu_percent: number }>;
  topMemory: Array<{ device_id: string; process_name: string; memory_mb: number }>;
}

export type CloudProviderStatusValue =
  | "OPERATIONAL"
  | "ADVISORY"
  | "DEGRADED"
  | "MAJOR_OUTAGE"
  | "MAINTENANCE"
  | "NOT_CONFIGURED";

export interface CloudProviderStatus {
  provider: string;
  display_name: string;
  status: CloudProviderStatusValue;
  status_url?: string;
  updated_at: number;
}

export interface CloudIncident {
  id: number;
  provider: string;
  external_id?: string;
  title: string;
  severity?: string;
  affected_services?: string;
  started_at?: number;
  updated_at?: number;
  resolved_at?: number | null;
  status_url?: string;
}

// Application Dependency Intelligence — layered on top of the process/
// service data above (ApplicationProcess/ApplicationServiceStatus), not a
// replacement for it.

export type DependencyNodeType =
  | "SCHEDULED_TASK"
  | "STARTUP_ITEM"
  | "DRIVER"
  | "NETWORK_ENDPOINT"
  | "DNS_RECORD"
  | "AUTH_PROVIDER";

export interface DependencyNode {
  id: number;
  device_id: string;
  application_id: number | null;
  node_type: DependencyNodeType;
  node_key: string;
  display_name: string;
  status: string | null;
  metadata: Record<string, unknown> | null;
  first_seen_at: number;
  last_seen_at: number;
  removed_at?: number | null;
}

export interface DependencyEdge {
  id: number;
  device_id: string;
  application_id: number | null;
  from_type: string;
  from_key: string;
  to_type: string;
  to_key: string;
  relation_type: string;
  created_at: number;
  last_seen_at: number;
}

export interface DependencyHealth {
  device_id: string;
  node_type: DependencyNodeType;
  node_key: string;
  application_id: number | null;
  health_score: number;
  level: string;
  breakdown: Record<string, number>;
  updated_at: number;
}

export interface DependencyEvent {
  id: number;
  device_id: string;
  application_id: number | null;
  node_type: DependencyNodeType | null;
  node_key: string | null;
  event_type: string;
  detail?: string;
  occurred_at: number;
}

export interface ApplicationDependencyGraph {
  processes: ApplicationProcess[];
  services: ApplicationServiceStatus[];
  scheduledTasks: DependencyNode[];
  startupItems: DependencyNode[];
  network: DependencyNode[];
  dns: DependencyNode[];
  authentication: DependencyNode | null;
  health: DependencyHealth[];
  events: DependencyEvent[];
  edges: DependencyEdge[];
}
