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

-- Keep existing databases forward-compatible when new columns are introduced.
ALTER TABLE alerts ADD COLUMN IF NOT EXISTS suggestion_id INTEGER;
ALTER TABLE alerts ADD COLUMN IF NOT EXISTS auto_healed BOOLEAN DEFAULT FALSE;
ALTER TABLE heal_suggestions ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'PENDING';
ALTER TABLE device_hardware ADD COLUMN IF NOT EXISTS health_score INTEGER;
ALTER TABLE device_hardware ADD COLUMN IF NOT EXISTS risk TEXT;
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

-- Insert default policy if not exists
INSERT INTO policies (cpu_threshold, ram_threshold, offline_seconds)
SELECT 80, 85, 20
WHERE NOT EXISTS (SELECT 1 FROM policies);
