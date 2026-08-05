-- Initialize AiOps database schema

-- Policies table
CREATE TABLE IF NOT EXISTS policies (
  id SERIAL PRIMARY KEY,
  cpu_threshold INTEGER DEFAULT 80,
  ram_threshold INTEGER DEFAULT 85,
  offline_seconds INTEGER DEFAULT 20,
  created_at BIGINT DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
);

-- Devices table
CREATE TABLE IF NOT EXISTS devices (
  id TEXT PRIMARY KEY,
  cpu NUMERIC,
  ram NUMERIC,
  time BIGINT,
  last_seen BIGINT,
  state TEXT DEFAULT 'OFFLINE',
  boot_time BIGINT
);

-- Device events table
CREATE TABLE IF NOT EXISTS device_events (
  id TEXT,
  type TEXT,
  message TEXT,
  time BIGINT
);

-- Alerts table
CREATE TABLE IF NOT EXISTS alerts (
  id TEXT,
  message TEXT,
  time BIGINT,
  acknowledged BOOLEAN DEFAULT FALSE,
  resolved BOOLEAN DEFAULT FALSE,
  suggestion_id INTEGER,
  auto_healed BOOLEAN DEFAULT FALSE
);

-- Metrics history table
CREATE TABLE IF NOT EXISTS metrics_history (
  id TEXT,
  cpu NUMERIC,
  ram NUMERIC,
  time BIGINT
);

-- Device inventory table
CREATE TABLE IF NOT EXISTS device_inventory (
  device_id TEXT PRIMARY KEY,
  services_summary JSONB,
  drivers_summary JSONB,
  updated_at BIGINT
);

-- Heal suggestions table
CREATE TABLE IF NOT EXISTS heal_suggestions (
  id SERIAL PRIMARY KEY,
  device_id TEXT,
  alert_type TEXT,
  reason TEXT,
  suggested_action TEXT,
  script TEXT,
  status TEXT DEFAULT 'PENDING',
  created_at BIGINT
);

-- Device compliance table (Security status)
CREATE TABLE IF NOT EXISTS device_compliance (
  device_id TEXT PRIMARY KEY,
  bitlocker TEXT,
  tpm TEXT,
  secureboot TEXT,
  defender TEXT,
  updated_at BIGINT
);

-- Device updates table (Windows updates and drivers)
CREATE TABLE IF NOT EXISTS device_updates (
  device_id TEXT PRIMARY KEY,
  windows_update_status TEXT,
  pending_updates INTEGER,
  failed_updates INTEGER,
  driver_status TEXT,
  outdated_drivers INTEGER,
  last_checked BIGINT
);

-- Device hardware table (Hardware metrics)
CREATE TABLE IF NOT EXISTS device_hardware (
  device_id TEXT PRIMARY KEY,
  disk NUMERIC,
  disk_free NUMERIC,
  cpu_temp NUMERIC,
  battery_health TEXT,
  battery_health_percent NUMERIC,
  fan_status TEXT,
  health_score INTEGER,
  risk TEXT,
  updated_at BIGINT
);

-- Processes table (Top processes)
CREATE TABLE IF NOT EXISTS processes (
  id SERIAL PRIMARY KEY,
  device_id TEXT,
  name TEXT,
  cpu NUMERIC,
  ram NUMERIC,
  time BIGINT
);

-- Script library
CREATE TABLE IF NOT EXISTS script_library (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  script TEXT NOT NULL
);

-- Auto-heal rules
CREATE TABLE IF NOT EXISTS heal_rules (
  id SERIAL PRIMARY KEY,
  alert_type TEXT NOT NULL,
  script TEXT NOT NULL,
  auto_enabled BOOLEAN DEFAULT FALSE
);

-- Script jobs
CREATE TABLE IF NOT EXISTS script_jobs (
  id SERIAL PRIMARY KEY,
  device_id TEXT NOT NULL,
  script TEXT NOT NULL,
  status TEXT DEFAULT 'PENDING',
  timeout INTEGER DEFAULT 120,
  output TEXT,
  error TEXT,
  approval_status TEXT,
  approval_user TEXT,
  agent_message TEXT,
  created_at BIGINT NOT NULL,
  started_at BIGINT,
  finished_at BIGINT,
  approved_at BIGINT,
  rejected_at BIGINT
);

-- Patch jobs: one row per triggered scan/install/reboot action on a device.
CREATE TABLE IF NOT EXISTS patch_jobs (
  id SERIAL PRIMARY KEY,
  device_id TEXT NOT NULL,
  action TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING',
  related_job_id INTEGER REFERENCES patch_jobs(id),
  percent_complete INTEGER,
  current_step_detail TEXT,
  updates_total INTEGER,
  updates_processed INTEGER,
  updates_failed INTEGER,
  reboot_required BOOLEAN DEFAULT FALSE,
  error TEXT,
  requested_by TEXT,
  timeout INTEGER DEFAULT 3600,
  created_at BIGINT NOT NULL,
  started_at BIGINT,
  finished_at BIGINT
);
CREATE INDEX IF NOT EXISTS idx_patch_jobs_device_status ON patch_jobs(device_id, status);

-- Patch history: durable terminal-outcome audit trail, decoupled from
-- patch_jobs so job rows can later be pruned/retained separately.
CREATE TABLE IF NOT EXISTS patch_history (
  id SERIAL PRIMARY KEY,
  device_id TEXT NOT NULL,
  patch_job_id INTEGER REFERENCES patch_jobs(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  status TEXT NOT NULL,
  updates_installed INTEGER DEFAULT 0,
  updates_failed INTEGER DEFAULT 0,
  reboot_required BOOLEAN DEFAULT FALSE,
  summary TEXT,
  occurred_at BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_patch_history_device ON patch_history(device_id, occurred_at DESC);

-- Reboot Intelligence: extends the existing per-device Windows Update
-- snapshot table rather than creating a near-duplicate one.
ALTER TABLE device_updates ADD COLUMN IF NOT EXISTS registry_reboot_pending BOOLEAN DEFAULT FALSE;
ALTER TABLE device_updates ADD COLUMN IF NOT EXISTS device_class TEXT;

-- Windows Update Collector Rebuild: per-KB catalog/history/events, layered
-- on top of the existing device_updates snapshot (extended below) and
-- patch_jobs/patch_history (unchanged) rather than duplicating them.
CREATE TABLE IF NOT EXISTS device_update_catalog (
  id BIGSERIAL PRIMARY KEY,
  device_id TEXT NOT NULL,
  update_id TEXT NOT NULL,
  revision_number INTEGER,
  kb TEXT,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  severity TEXT,
  size_bytes BIGINT,
  is_downloaded BOOLEAN DEFAULT FALSE,
  is_hidden BOOLEAN DEFAULT FALSE,
  is_mandatory BOOLEAN DEFAULT FALSE,
  reboot_behavior TEXT,
  state TEXT NOT NULL,
  failure_hresult TEXT,
  first_seen_at BIGINT NOT NULL,
  last_seen_at BIGINT NOT NULL,
  removed_at BIGINT,
  UNIQUE (device_id, update_id)
);
CREATE INDEX IF NOT EXISTS idx_device_update_catalog_device ON device_update_catalog(device_id);

CREATE TABLE IF NOT EXISTS device_update_history (
  id BIGSERIAL PRIMARY KEY,
  device_id TEXT NOT NULL,
  update_id TEXT,
  kb TEXT,
  title TEXT,
  success BOOLEAN NOT NULL,
  hresult TEXT,
  source TEXT NOT NULL,
  occurred_at BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_device_update_history_device ON device_update_history(device_id, occurred_at DESC);

CREATE TABLE IF NOT EXISTS device_update_events (
  id BIGSERIAL PRIMARY KEY,
  device_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  message TEXT,
  raw_event_id INTEGER,
  occurred_at BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_device_update_events_device ON device_update_events(device_id, occurred_at DESC);

ALTER TABLE device_updates ADD COLUMN IF NOT EXISTS update_source TEXT;
ALTER TABLE device_updates ADD COLUMN IF NOT EXISTS wu_service_status TEXT;
ALTER TABLE device_updates ADD COLUMN IF NOT EXISTS bits_service_status TEXT;
ALTER TABLE device_updates ADD COLUMN IF NOT EXISTS update_medic_status TEXT;
ALTER TABLE device_updates ADD COLUMN IF NOT EXISTS last_scan_at BIGINT;
ALTER TABLE device_updates ADD COLUMN IF NOT EXISTS last_successful_scan_at BIGINT;
ALTER TABLE device_updates ADD COLUMN IF NOT EXISTS last_failed_scan_at BIGINT;
ALTER TABLE device_updates ADD COLUMN IF NOT EXISTS last_install_at BIGINT;
ALTER TABLE device_updates ADD COLUMN IF NOT EXISTS scan_duration_ms INTEGER;
ALTER TABLE device_updates ADD COLUMN IF NOT EXISTS reboot_reason TEXT;

-- Real reboot event history — append-only, unlike device_updates.
CREATE TABLE IF NOT EXISTS device_reboot_history (
  id SERIAL PRIMARY KEY,
  device_id TEXT NOT NULL,
  previous_boot_time BIGINT,
  new_boot_time BIGINT NOT NULL,
  uptime_before_reboot_ms BIGINT,
  detected_at BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_reboot_history_device ON device_reboot_history(device_id, detected_at DESC);

-- Per-device-class reboot policy thresholds.
CREATE TABLE IF NOT EXISTS reboot_policies (
  device_class TEXT PRIMARY KEY,
  max_uptime_days INTEGER NOT NULL
);
INSERT INTO reboot_policies (device_class, max_uptime_days) VALUES
  ('laptop', 7), ('desktop', 14), ('server', 30),
  ('shared_device', 14), ('kiosk', 60), ('unknown', 7)
ON CONFLICT (device_class) DO NOTHING;

-- =====================================================
-- User & Privilege Collector
-- Real multi-source session/privilege data (query user + Win32_LogonSession
-- for sessions, Get-LocalGroupMember for admins, token-inspection via
-- P/Invoke for actual elevation state) — never fabricated group-name-only
-- admin status.
-- =====================================================

-- Snapshot-replace-per-device-per-cycle, mirrors application_processes.
CREATE TABLE IF NOT EXISTS device_sessions (
  id BIGSERIAL PRIMARY KEY,
  device_id TEXT NOT NULL,
  session_id INTEGER,
  username TEXT,
  domain TEXT,
  sid TEXT,
  session_name TEXT,
  state TEXT,
  logon_type INTEGER,
  logon_time BIGINT,
  idle_time_ms BIGINT,
  is_active BOOLEAN DEFAULT FALSE,
  is_local_account BOOLEAN,
  is_azure_ad_account BOOLEAN,
  is_microsoft_account BOOLEAN,
  account_type TEXT,
  is_administrator BOOLEAN,
  is_elevated BOOLEAN,
  elevation_source TEXT,
  collected_at BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_device_sessions_device ON device_sessions(device_id);

-- Upsert + removal detection, mirrors application_inventory.
CREATE TABLE IF NOT EXISTS device_local_administrators (
  id BIGSERIAL PRIMARY KEY,
  device_id TEXT NOT NULL,
  sid TEXT NOT NULL,
  username TEXT,
  domain TEXT,
  source TEXT,
  enabled BOOLEAN,
  last_logon BIGINT,
  password_last_set BIGINT,
  first_seen_at BIGINT NOT NULL,
  last_seen_at BIGINT NOT NULL,
  removed_at BIGINT,
  UNIQUE (device_id, sid)
);
CREATE INDEX IF NOT EXISTS idx_device_local_admins_device ON device_local_administrators(device_id);

-- Append-only, mirrors dependency_events. Diffed server-side, not by the agent.
CREATE TABLE IF NOT EXISTS device_admin_events (
  id BIGSERIAL PRIMARY KEY,
  device_id TEXT NOT NULL,
  sid TEXT,
  username TEXT,
  event_type TEXT NOT NULL,
  detail TEXT,
  occurred_at BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_device_admin_events_device ON device_admin_events(device_id, occurred_at DESC);

-- Single-row-per-device latest snapshot, mirrors device_updates.
CREATE TABLE IF NOT EXISTS device_user_privilege (
  device_id TEXT PRIMARY KEY,
  uac_enabled BOOLEAN,
  primary_username TEXT,
  primary_domain TEXT,
  primary_account_type TEXT,
  primary_is_administrator BOOLEAN,
  primary_is_elevated BOOLEAN,
  primary_session_type TEXT,
  last_scan_at BIGINT
);

-- =====================================================
-- Digital Workplace Intelligence
-- =====================================================

CREATE TABLE IF NOT EXISTS applications (
  id SERIAL PRIMARY KEY,
  canonical_name TEXT NOT NULL,
  publisher TEXT,
  category TEXT NOT NULL DEFAULT 'Unknown',
  plugin_id TEXT,
  cloud_provider TEXT,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL,
  UNIQUE (canonical_name, publisher)
);

CREATE TABLE IF NOT EXISTS application_inventory (
  id SERIAL PRIMARY KEY,
  device_id TEXT NOT NULL,
  application_id INTEGER NOT NULL REFERENCES applications(id),
  display_name TEXT NOT NULL,
  version TEXT,
  publisher TEXT,
  install_date BIGINT,
  install_location TEXT,
  architecture TEXT,
  estimated_size_kb INTEGER,
  install_source TEXT NOT NULL,
  product_code TEXT,
  uninstall_command TEXT,
  first_seen_at BIGINT NOT NULL,
  last_seen_at BIGINT NOT NULL,
  removed_at BIGINT,
  UNIQUE (device_id, application_id, install_source, product_code)
);
CREATE INDEX IF NOT EXISTS idx_app_inventory_device ON application_inventory(device_id);

CREATE TABLE IF NOT EXISTS application_processes (
  id BIGSERIAL PRIMARY KEY,
  device_id TEXT NOT NULL,
  application_id INTEGER REFERENCES applications(id),
  pid INTEGER NOT NULL,
  parent_pid INTEGER,
  process_name TEXT NOT NULL,
  exe_path TEXT,
  cpu_percent NUMERIC,
  memory_mb NUMERIC,
  threads INTEGER,
  handles INTEGER,
  start_time BIGINT,
  owner TEXT,
  responding BOOLEAN,
  window_title TEXT,
  signed BOOLEAN,
  publisher TEXT,
  cert_issuer TEXT,
  cert_expires_at BIGINT,
  cert_thumbprint TEXT,
  collected_at BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_app_processes_device_time ON application_processes(device_id, collected_at DESC);

CREATE TABLE IF NOT EXISTS application_health (
  device_id TEXT NOT NULL,
  application_id INTEGER NOT NULL REFERENCES applications(id),
  health_score INTEGER NOT NULL,
  level TEXT NOT NULL,
  breakdown JSONB,
  updated_at BIGINT NOT NULL,
  PRIMARY KEY (device_id, application_id)
);

CREATE TABLE IF NOT EXISTS application_health_history (
  id BIGSERIAL PRIMARY KEY,
  device_id TEXT NOT NULL,
  application_id INTEGER NOT NULL REFERENCES applications(id),
  health_score INTEGER NOT NULL,
  recorded_at BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_app_health_history ON application_health_history(device_id, application_id, recorded_at DESC);

CREATE TABLE IF NOT EXISTS application_services (
  device_id TEXT NOT NULL,
  application_id INTEGER NOT NULL REFERENCES applications(id),
  service_name TEXT NOT NULL,
  display_name TEXT,
  status TEXT,
  startup_type TEXT,
  restart_count INTEGER DEFAULT 0,
  logon_account TEXT,
  updated_at BIGINT NOT NULL,
  PRIMARY KEY (device_id, application_id, service_name)
);

-- Merges what would otherwise be two near-identical event-log tables
-- (application_history + application_timelines) into one.
CREATE TABLE IF NOT EXISTS application_history (
  id BIGSERIAL PRIMARY KEY,
  device_id TEXT NOT NULL,
  application_id INTEGER REFERENCES applications(id),
  event_type TEXT NOT NULL,
  detail TEXT,
  occurred_at BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_app_history_device ON application_history(device_id, occurred_at DESC);

CREATE TABLE IF NOT EXISTS cloud_services (
  provider TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'NOT_CONFIGURED',
  status_url TEXT,
  updated_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS cloud_incidents (
  id SERIAL PRIMARY KEY,
  provider TEXT NOT NULL REFERENCES cloud_services(provider),
  external_id TEXT,
  title TEXT NOT NULL,
  severity TEXT,
  affected_services TEXT,
  started_at BIGINT,
  updated_at BIGINT,
  resolved_at BIGINT,
  status_url TEXT
);
CREATE INDEX IF NOT EXISTS idx_cloud_incidents_provider ON cloud_incidents(provider, started_at DESC);

-- =====================================================
-- Application Dependency Intelligence
-- Layers scheduled tasks / startup items / drivers / network / DNS /
-- authentication signals on top of the existing application_processes and
-- application_services tables (not duplicated here) to assemble a full
-- dependency graph + rule-based root cause analysis per application.
-- =====================================================

CREATE TABLE IF NOT EXISTS dependency_nodes (
  id BIGSERIAL PRIMARY KEY,
  device_id TEXT NOT NULL,
  application_id INTEGER REFERENCES applications(id),
  node_type TEXT NOT NULL,
  node_key TEXT NOT NULL,
  display_name TEXT NOT NULL,
  status TEXT,
  metadata JSONB,
  first_seen_at BIGINT NOT NULL,
  last_seen_at BIGINT NOT NULL,
  removed_at BIGINT,
  UNIQUE (device_id, node_type, node_key)
);
CREATE INDEX IF NOT EXISTS idx_dependency_nodes_device ON dependency_nodes(device_id);
CREATE INDEX IF NOT EXISTS idx_dependency_nodes_app ON dependency_nodes(application_id);

CREATE TABLE IF NOT EXISTS dependency_edges (
  id BIGSERIAL PRIMARY KEY,
  device_id TEXT NOT NULL,
  application_id INTEGER REFERENCES applications(id),
  from_type TEXT NOT NULL,
  from_key TEXT NOT NULL,
  to_type TEXT NOT NULL,
  to_key TEXT NOT NULL,
  relation_type TEXT NOT NULL,
  created_at BIGINT NOT NULL,
  last_seen_at BIGINT NOT NULL,
  UNIQUE (device_id, from_type, from_key, to_type, to_key, relation_type)
);
CREATE INDEX IF NOT EXISTS idx_dependency_edges_device ON dependency_edges(device_id);
CREATE INDEX IF NOT EXISTS idx_dependency_edges_app ON dependency_edges(application_id);

CREATE TABLE IF NOT EXISTS dependency_health (
  device_id TEXT NOT NULL,
  node_type TEXT NOT NULL,
  node_key TEXT NOT NULL,
  application_id INTEGER REFERENCES applications(id),
  health_score INTEGER NOT NULL,
  level TEXT NOT NULL,
  breakdown JSONB,
  updated_at BIGINT NOT NULL,
  PRIMARY KEY (device_id, node_type, node_key)
);

CREATE TABLE IF NOT EXISTS dependency_events (
  id BIGSERIAL PRIMARY KEY,
  device_id TEXT NOT NULL,
  application_id INTEGER REFERENCES applications(id),
  node_type TEXT,
  node_key TEXT,
  event_type TEXT NOT NULL,
  detail TEXT,
  occurred_at BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_dependency_events_device ON dependency_events(device_id, occurred_at DESC);

-- Keep existing databases forward-compatible when new columns are introduced.
ALTER TABLE alerts ADD COLUMN IF NOT EXISTS suggestion_id INTEGER;
ALTER TABLE alerts ADD COLUMN IF NOT EXISTS auto_healed BOOLEAN DEFAULT FALSE;
ALTER TABLE heal_suggestions ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'PENDING';
ALTER TABLE device_hardware ADD COLUMN IF NOT EXISTS health_score INTEGER;
ALTER TABLE device_hardware ADD COLUMN IF NOT EXISTS risk TEXT;
ALTER TABLE application_processes ADD COLUMN IF NOT EXISTS cert_issuer TEXT;
ALTER TABLE application_processes ADD COLUMN IF NOT EXISTS cert_expires_at BIGINT;
ALTER TABLE application_processes ADD COLUMN IF NOT EXISTS cert_thumbprint TEXT;
ALTER TABLE script_jobs ADD COLUMN IF NOT EXISTS timeout INTEGER DEFAULT 120;
ALTER TABLE script_jobs ADD COLUMN IF NOT EXISTS output TEXT;
ALTER TABLE script_jobs ADD COLUMN IF NOT EXISTS error TEXT;
ALTER TABLE script_jobs ADD COLUMN IF NOT EXISTS approval_status TEXT;
ALTER TABLE script_jobs ADD COLUMN IF NOT EXISTS approval_user TEXT;
ALTER TABLE script_jobs ADD COLUMN IF NOT EXISTS agent_message TEXT;
ALTER TABLE script_jobs ADD COLUMN IF NOT EXISTS started_at BIGINT;
ALTER TABLE script_jobs ADD COLUMN IF NOT EXISTS finished_at BIGINT;
ALTER TABLE script_jobs ADD COLUMN IF NOT EXISTS approved_at BIGINT;
ALTER TABLE script_jobs ADD COLUMN IF NOT EXISTS rejected_at BIGINT;

-- Metric definitions (generic metadata for the historical analytics platform)
CREATE TABLE IF NOT EXISTS metric_definitions (
  metric_name TEXT PRIMARY KEY,
  unit TEXT,
  aggregation_type TEXT NOT NULL DEFAULT 'avg',
  description TEXT
);

-- Metric samples (generic raw time-series store, one row per device+metric+timestamp)
CREATE TABLE IF NOT EXISTS metric_samples (
  id BIGSERIAL PRIMARY KEY,
  device_id TEXT NOT NULL,
  metric_name TEXT NOT NULL,
  value NUMERIC NOT NULL,
  source TEXT NOT NULL DEFAULT 'agent',
  collected_at BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_metric_samples_lookup
  ON metric_samples(device_id, metric_name, collected_at);

-- Metric aggregates (hourly/daily rollups; week/month/year are computed on read)
CREATE TABLE IF NOT EXISTS metric_aggregates (
  device_id TEXT NOT NULL,
  metric_name TEXT NOT NULL,
  granularity TEXT NOT NULL,
  bucket_start BIGINT NOT NULL,
  avg_value NUMERIC,
  min_value NUMERIC,
  max_value NUMERIC,
  sample_count INTEGER,
  PRIMARY KEY (device_id, metric_name, granularity, bucket_start)
);

-- Metric baselines (rolling mean/stddev per device+metric)
CREATE TABLE IF NOT EXISTS metric_baselines (
  device_id TEXT NOT NULL,
  metric_name TEXT NOT NULL,
  mean_value NUMERIC NOT NULL,
  stddev_value NUMERIC NOT NULL DEFAULT 0,
  sample_count INTEGER NOT NULL DEFAULT 0,
  updated_at BIGINT,
  PRIMARY KEY (device_id, metric_name)
);

-- Metric anomalies (detected outliers vs. baseline)
CREATE TABLE IF NOT EXISTS metric_anomalies (
  id BIGSERIAL PRIMARY KEY,
  device_id TEXT NOT NULL,
  metric_name TEXT NOT NULL,
  value NUMERIC NOT NULL,
  baseline_mean NUMERIC,
  z_score NUMERIC,
  detected_at BIGINT NOT NULL
);

-- Retention policies (configurable, read by the retention cleanup job)
CREATE TABLE IF NOT EXISTS retention_policies (
  target TEXT PRIMARY KEY,
  retain_days INTEGER NOT NULL
);

-- Single-row cursor so the baseline job only processes samples once (no double counting)
CREATE TABLE IF NOT EXISTS analytics_cursor (
  id SMALLINT PRIMARY KEY DEFAULT 1,
  last_baseline_at BIGINT
);

-- Seed metric definitions for metrics already collected by the agent today
INSERT INTO metric_definitions (metric_name, unit, aggregation_type, description) VALUES
  ('cpu', 'percent', 'avg', 'CPU utilization'),
  ('ram', 'percent', 'avg', 'Memory utilization'),
  ('disk', 'percent', 'avg', 'Disk usage'),
  ('disk_free', 'GB', 'avg', 'Free disk space'),
  ('cpu_temp', 'celsius', 'avg', 'CPU temperature'),
  ('battery_health_percent', 'percent', 'avg', 'Battery capacity health'),
  ('uptime_seconds', 'seconds', 'last', 'Time since last boot'),
  ('pending_updates', 'count', 'last', 'Pending Windows updates'),
  ('failed_updates', 'count', 'last', 'Failed Windows updates')
ON CONFLICT (metric_name) DO NOTHING;

-- Seed default retention policy if not exists
INSERT INTO retention_policies (target, retain_days) VALUES
  ('raw', 7),
  ('hour', 90),
  ('day', 730),
  ('metrics_history', 30),
  ('processes', 14)
ON CONFLICT (target) DO NOTHING;

-- Insert default policy if not exists
INSERT INTO policies (cpu_threshold, ram_threshold, offline_seconds)
SELECT 80, 85, 20
WHERE NOT EXISTS (SELECT 1 FROM policies);

-- =====================================================
-- Authentication
-- =====================================================

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  display_name TEXT,
  role TEXT NOT NULL DEFAULT 'read_only',
  created_at BIGINT NOT NULL,
  last_login_at BIGINT
);
ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'read_only';

-- Positive-grant RBAC: a row's presence means the role is granted that
-- action on that module. Absence means denied. Modules match CLAUDE.md's
-- "Permissions" section; actions are view/create/edit/delete/execute.
CREATE TABLE IF NOT EXISTS role_permissions (
  role TEXT NOT NULL,
  module TEXT NOT NULL,
  action TEXT NOT NULL,
  PRIMARY KEY (role, module, action)
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  created_at BIGINT NOT NULL,
  expires_at BIGINT NOT NULL,
  revoked_at BIGINT
);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token_hash ON refresh_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);

-- Seed dev-only users so login and RBAC are testable out of the box.
-- NOT production credentials — password for both: ChangeMe123!
INSERT INTO users (email, username, password_hash, display_name, role, created_at)
SELECT
  'admin@aiops.local',
  'admin',
  '$2b$10$5PVoQqjp2X.rcjL3Efe8F.UZgKy4KKze.VBhxOqI.MQJvt5991j.6',
  'Administrator',
  'super_admin',
  (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'admin@aiops.local');

INSERT INTO users (email, username, password_hash, display_name, role, created_at)
SELECT
  'readonly@aiops.local',
  'readonly',
  '$2b$10$g94IZ2OexnBAQuYVL3CdTOMYg.xJSBfh5UZ.RcT84TFDVDPcQJs9q',
  'Read Only User',
  'read_only',
  (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'readonly@aiops.local');

-- Positive-grant permission matrix. super_admin gets every module/action;
-- the other 5 roles get a defensible operational default.
DO $$
DECLARE
  m TEXT;
  a TEXT;
BEGIN
  FOREACH m IN ARRAY ARRAY['dashboard','devices','inventory','compliance','incidents','autoHeal','policies','reports','settings','users']
  LOOP
    FOREACH a IN ARRAY ARRAY['view','create','edit','delete','execute']
    LOOP
      INSERT INTO role_permissions (role, module, action) VALUES ('super_admin', m, a)
      ON CONFLICT (role, module, action) DO NOTHING;
    END LOOP;
  END LOOP;
END $$;

INSERT INTO role_permissions (role, module, action) VALUES
  ('it_admin','dashboard','view'),
  ('it_admin','devices','view'),('it_admin','devices','create'),('it_admin','devices','edit'),('it_admin','devices','execute'),
  ('it_admin','inventory','view'),('it_admin','inventory','edit'),
  ('it_admin','compliance','view'),('it_admin','compliance','edit'),
  ('it_admin','incidents','view'),('it_admin','incidents','create'),('it_admin','incidents','edit'),('it_admin','incidents','execute'),('it_admin','incidents','delete'),
  ('it_admin','autoHeal','view'),('it_admin','autoHeal','create'),('it_admin','autoHeal','edit'),('it_admin','autoHeal','execute'),
  ('it_admin','policies','view'),('it_admin','policies','create'),('it_admin','policies','edit'),
  ('it_admin','reports','view'),
  ('it_admin','settings','view'),

  ('helpdesk','dashboard','view'),
  ('helpdesk','devices','view'),('helpdesk','devices','execute'),
  ('helpdesk','inventory','view'),
  ('helpdesk','compliance','view'),
  ('helpdesk','incidents','view'),('helpdesk','incidents','create'),('helpdesk','incidents','edit'),('helpdesk','incidents','execute'),
  ('helpdesk','autoHeal','view'),('helpdesk','autoHeal','execute'),
  ('helpdesk','policies','view'),
  ('helpdesk','reports','view'),

  ('security_analyst','dashboard','view'),
  ('security_analyst','devices','view'),
  ('security_analyst','inventory','view'),
  ('security_analyst','compliance','view'),('security_analyst','compliance','edit'),
  ('security_analyst','incidents','view'),('security_analyst','incidents','edit'),
  ('security_analyst','autoHeal','view'),
  ('security_analyst','policies','view'),('security_analyst','policies','edit'),
  ('security_analyst','reports','view'),('security_analyst','reports','create'),
  ('security_analyst','settings','view'),

  ('read_only','dashboard','view'),
  ('read_only','devices','view'),
  ('read_only','inventory','view'),
  ('read_only','compliance','view'),
  ('read_only','incidents','view'),
  ('read_only','autoHeal','view'),
  ('read_only','policies','view'),
  ('read_only','reports','view'),

  ('auditor','dashboard','view'),
  ('auditor','devices','view'),
  ('auditor','inventory','view'),
  ('auditor','compliance','view'),
  ('auditor','incidents','view'),
  ('auditor','autoHeal','view'),
  ('auditor','policies','view'),
  ('auditor','reports','view'),('auditor','reports','create'),
  ('auditor','settings','view'),
  ('auditor','users','view')
ON CONFLICT (role, module, action) DO NOTHING;
