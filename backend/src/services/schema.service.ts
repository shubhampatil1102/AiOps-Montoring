import bcrypt from "bcryptjs";
import { RBAC_ACTIONS, RBAC_MODULES } from "../constants/rbac";
import { query } from "../repositories/db.repository";

export async function ensureInventoryTable() {
  await query(`
    CREATE TABLE IF NOT EXISTS device_inventory (
      device_id TEXT PRIMARY KEY,
      services_summary JSONB,
      drivers_summary JSONB,
      updated_at BIGINT
    )
  `);
}

export async function ensureRuntimeTables() {
  await query(`
    CREATE TABLE IF NOT EXISTS script_library (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      script TEXT NOT NULL
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS heal_rules (
      id SERIAL PRIMARY KEY,
      alert_type TEXT NOT NULL,
      script TEXT NOT NULL,
      auto_enabled BOOLEAN DEFAULT FALSE
    )
  `);

  await query(`
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
    )
  `);

  await query(`
    ALTER TABLE alerts
    ADD COLUMN IF NOT EXISTS suggestion_id INTEGER
  `);
  await query(`
    ALTER TABLE alerts
    ADD COLUMN IF NOT EXISTS auto_healed BOOLEAN DEFAULT FALSE
  `);
  await query(`
    ALTER TABLE heal_suggestions
    ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'PENDING'
  `);
  await query(`
    ALTER TABLE device_hardware
    ADD COLUMN IF NOT EXISTS health_score INTEGER
  `);
  await query(`
    ALTER TABLE device_hardware
    ADD COLUMN IF NOT EXISTS risk TEXT
  `);
}

export async function ensureApplicationTables() {
  await query(`
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
    )
  `);

  await query(`
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
    )
  `);
  await query(`CREATE INDEX IF NOT EXISTS idx_app_inventory_device ON application_inventory(device_id)`);

  await query(`
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
    )
  `);
  await query(`CREATE INDEX IF NOT EXISTS idx_app_processes_device_time ON application_processes(device_id, collected_at DESC)`);
  await query(`ALTER TABLE application_processes ADD COLUMN IF NOT EXISTS cert_issuer TEXT`);
  await query(`ALTER TABLE application_processes ADD COLUMN IF NOT EXISTS cert_expires_at BIGINT`);
  await query(`ALTER TABLE application_processes ADD COLUMN IF NOT EXISTS cert_thumbprint TEXT`);

  await query(`
    CREATE TABLE IF NOT EXISTS application_health (
      device_id TEXT NOT NULL,
      application_id INTEGER NOT NULL REFERENCES applications(id),
      health_score INTEGER NOT NULL,
      level TEXT NOT NULL,
      breakdown JSONB,
      updated_at BIGINT NOT NULL,
      PRIMARY KEY (device_id, application_id)
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS application_health_history (
      id BIGSERIAL PRIMARY KEY,
      device_id TEXT NOT NULL,
      application_id INTEGER NOT NULL REFERENCES applications(id),
      health_score INTEGER NOT NULL,
      recorded_at BIGINT NOT NULL
    )
  `);
  await query(`CREATE INDEX IF NOT EXISTS idx_app_health_history ON application_health_history(device_id, application_id, recorded_at DESC)`);

  await query(`
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
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS application_history (
      id BIGSERIAL PRIMARY KEY,
      device_id TEXT NOT NULL,
      application_id INTEGER REFERENCES applications(id),
      event_type TEXT NOT NULL,
      detail TEXT,
      occurred_at BIGINT NOT NULL
    )
  `);
  await query(`CREATE INDEX IF NOT EXISTS idx_app_history_device ON application_history(device_id, occurred_at DESC)`);

  await query(`
    CREATE TABLE IF NOT EXISTS cloud_services (
      provider TEXT PRIMARY KEY,
      display_name TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'NOT_CONFIGURED',
      status_url TEXT,
      updated_at BIGINT NOT NULL
    )
  `);

  await query(`
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
    )
  `);
  await query(`CREATE INDEX IF NOT EXISTS idx_cloud_incidents_provider ON cloud_incidents(provider, started_at DESC)`);
}

export async function ensureDependencyTables() {
  await query(`
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
    )
  `);
  await query(`CREATE INDEX IF NOT EXISTS idx_dependency_nodes_device ON dependency_nodes(device_id)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_dependency_nodes_app ON dependency_nodes(application_id)`);

  await query(`
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
    )
  `);
  await query(`CREATE INDEX IF NOT EXISTS idx_dependency_edges_device ON dependency_edges(device_id)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_dependency_edges_app ON dependency_edges(application_id)`);

  await query(`
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
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS dependency_events (
      id BIGSERIAL PRIMARY KEY,
      device_id TEXT NOT NULL,
      application_id INTEGER REFERENCES applications(id),
      node_type TEXT,
      node_key TEXT,
      event_type TEXT NOT NULL,
      detail TEXT,
      occurred_at BIGINT NOT NULL
    )
  `);
  await query(`CREATE INDEX IF NOT EXISTS idx_dependency_events_device ON dependency_events(device_id, occurred_at DESC)`);
}

export async function ensurePatchTables() {
  await query(`
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
    )
  `);
  await query(`CREATE INDEX IF NOT EXISTS idx_patch_jobs_device_status ON patch_jobs(device_id, status)`);

  await query(`
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
    )
  `);
  await query(`CREATE INDEX IF NOT EXISTS idx_patch_history_device ON patch_history(device_id, occurred_at DESC)`);
}

export async function ensureWindowsUpdateTables() {
  await query(`
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
    )
  `);
  await query(`CREATE INDEX IF NOT EXISTS idx_device_update_catalog_device ON device_update_catalog(device_id)`);

  await query(`
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
    )
  `);
  await query(`CREATE INDEX IF NOT EXISTS idx_device_update_history_device ON device_update_history(device_id, occurred_at DESC)`);

  await query(`
    CREATE TABLE IF NOT EXISTS device_update_events (
      id BIGSERIAL PRIMARY KEY,
      device_id TEXT NOT NULL,
      event_type TEXT NOT NULL,
      message TEXT,
      raw_event_id INTEGER,
      occurred_at BIGINT NOT NULL
    )
  `);
  await query(`CREATE INDEX IF NOT EXISTS idx_device_update_events_device ON device_update_events(device_id, occurred_at DESC)`);

  await query(`ALTER TABLE device_updates ADD COLUMN IF NOT EXISTS update_source TEXT`);
  await query(`ALTER TABLE device_updates ADD COLUMN IF NOT EXISTS wu_service_status TEXT`);
  await query(`ALTER TABLE device_updates ADD COLUMN IF NOT EXISTS bits_service_status TEXT`);
  await query(`ALTER TABLE device_updates ADD COLUMN IF NOT EXISTS update_medic_status TEXT`);
  await query(`ALTER TABLE device_updates ADD COLUMN IF NOT EXISTS last_scan_at BIGINT`);
  await query(`ALTER TABLE device_updates ADD COLUMN IF NOT EXISTS last_successful_scan_at BIGINT`);
  await query(`ALTER TABLE device_updates ADD COLUMN IF NOT EXISTS last_failed_scan_at BIGINT`);
  await query(`ALTER TABLE device_updates ADD COLUMN IF NOT EXISTS last_install_at BIGINT`);
  await query(`ALTER TABLE device_updates ADD COLUMN IF NOT EXISTS scan_duration_ms INTEGER`);
  await query(`ALTER TABLE device_updates ADD COLUMN IF NOT EXISTS reboot_reason TEXT`);
}

export async function ensureRebootTables() {
  await query(`ALTER TABLE device_updates ADD COLUMN IF NOT EXISTS registry_reboot_pending BOOLEAN DEFAULT FALSE`);
  await query(`ALTER TABLE device_updates ADD COLUMN IF NOT EXISTS device_class TEXT`);

  await query(`
    CREATE TABLE IF NOT EXISTS device_reboot_history (
      id SERIAL PRIMARY KEY,
      device_id TEXT NOT NULL,
      previous_boot_time BIGINT,
      new_boot_time BIGINT NOT NULL,
      uptime_before_reboot_ms BIGINT,
      detected_at BIGINT NOT NULL
    )
  `);
  await query(`CREATE INDEX IF NOT EXISTS idx_reboot_history_device ON device_reboot_history(device_id, detected_at DESC)`);

  await query(`
    CREATE TABLE IF NOT EXISTS reboot_policies (
      device_class TEXT PRIMARY KEY,
      max_uptime_days INTEGER NOT NULL
    )
  `);
  await query(`
    INSERT INTO reboot_policies (device_class, max_uptime_days) VALUES
      ('laptop', 7), ('desktop', 14), ('server', 30),
      ('shared_device', 14), ('kiosk', 60), ('unknown', 7)
    ON CONFLICT (device_class) DO NOTHING
  `);
}

export async function ensureUserPrivilegeTables() {
  await query(`
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
    )
  `);
  await query(`CREATE INDEX IF NOT EXISTS idx_device_sessions_device ON device_sessions(device_id)`);

  await query(`
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
    )
  `);
  await query(`CREATE INDEX IF NOT EXISTS idx_device_local_admins_device ON device_local_administrators(device_id)`);

  await query(`
    CREATE TABLE IF NOT EXISTS device_admin_events (
      id BIGSERIAL PRIMARY KEY,
      device_id TEXT NOT NULL,
      sid TEXT,
      username TEXT,
      event_type TEXT NOT NULL,
      detail TEXT,
      occurred_at BIGINT NOT NULL
    )
  `);
  await query(`CREATE INDEX IF NOT EXISTS idx_device_admin_events_device ON device_admin_events(device_id, occurred_at DESC)`);

  await query(`
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
    )
  `);
}

export async function ensureAnalyticsTables() {
  await query(`
    CREATE TABLE IF NOT EXISTS metric_definitions (
      metric_name TEXT PRIMARY KEY,
      unit TEXT,
      aggregation_type TEXT NOT NULL DEFAULT 'avg',
      description TEXT
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS metric_samples (
      id BIGSERIAL PRIMARY KEY,
      device_id TEXT NOT NULL,
      metric_name TEXT NOT NULL,
      value NUMERIC NOT NULL,
      source TEXT NOT NULL DEFAULT 'agent',
      collected_at BIGINT NOT NULL
    )
  `);
  await query(`
    CREATE INDEX IF NOT EXISTS idx_metric_samples_lookup
      ON metric_samples(device_id, metric_name, collected_at)
  `);

  await query(`
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
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS metric_baselines (
      device_id TEXT NOT NULL,
      metric_name TEXT NOT NULL,
      mean_value NUMERIC NOT NULL,
      stddev_value NUMERIC NOT NULL DEFAULT 0,
      sample_count INTEGER NOT NULL DEFAULT 0,
      updated_at BIGINT,
      PRIMARY KEY (device_id, metric_name)
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS metric_anomalies (
      id BIGSERIAL PRIMARY KEY,
      device_id TEXT NOT NULL,
      metric_name TEXT NOT NULL,
      value NUMERIC NOT NULL,
      baseline_mean NUMERIC,
      z_score NUMERIC,
      detected_at BIGINT NOT NULL
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS retention_policies (
      target TEXT PRIMARY KEY,
      retain_days INTEGER NOT NULL
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS analytics_cursor (
      id SMALLINT PRIMARY KEY DEFAULT 1,
      last_baseline_at BIGINT
    )
  `);

  await query(`
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
    ON CONFLICT (metric_name) DO NOTHING
  `);

  await query(`
    INSERT INTO retention_policies (target, retain_days) VALUES
      ('raw', 7),
      ('hour', 90),
      ('day', 730),
      ('metrics_history', 30),
      ('processes', 14)
    ON CONFLICT (target) DO NOTHING
  `);
}

export async function ensureAuthTables() {
  await query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      display_name TEXT,
      created_at BIGINT NOT NULL,
      last_login_at BIGINT
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS refresh_tokens (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash TEXT NOT NULL,
      created_at BIGINT NOT NULL,
      expires_at BIGINT NOT NULL,
      revoked_at BIGINT
    )
  `);
  await query(`CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token_hash ON refresh_tokens(token_hash)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id)`);

  await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'read_only'`);

  const existingAdmin = await query("SELECT 1 FROM users WHERE email = $1", ["admin@aiops.local"]);
  if (existingAdmin.rowCount === 0) {
    // Dev-only seed so the login page is testable out of the box —
    // NOT a production credential.
    const passwordHash = await bcrypt.hash("ChangeMe123!", 10);
    await query(
      `INSERT INTO users (email, username, password_hash, display_name, role, created_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      ["admin@aiops.local", "admin", passwordHash, "Administrator", "super_admin", Date.now()]
    );
  } else {
    // The admin user may already exist from before the role column did
    // (it does on this dev database — created by the previous epic) — the
    // ALTER TABLE above would have silently left it on the 'read_only'
    // column default. Enforce the invariant unconditionally rather than
    // only setting it at insert time.
    await query(`UPDATE users SET role = 'super_admin' WHERE email = $1 AND role <> 'super_admin'`, ["admin@aiops.local"]);
  }
}

const ROLE_GRANTS: Record<string, [string, string][]> = {
  it_admin: [
    ["dashboard", "view"],
    ["devices", "view"], ["devices", "create"], ["devices", "edit"], ["devices", "execute"],
    ["inventory", "view"], ["inventory", "edit"],
    ["compliance", "view"], ["compliance", "edit"],
    ["incidents", "view"], ["incidents", "create"], ["incidents", "edit"], ["incidents", "execute"], ["incidents", "delete"],
    ["autoHeal", "view"], ["autoHeal", "create"], ["autoHeal", "edit"], ["autoHeal", "execute"],
    ["policies", "view"], ["policies", "create"], ["policies", "edit"],
    ["reports", "view"],
    ["settings", "view"],
  ],
  helpdesk: [
    ["dashboard", "view"],
    ["devices", "view"], ["devices", "execute"],
    ["inventory", "view"],
    ["compliance", "view"],
    ["incidents", "view"], ["incidents", "create"], ["incidents", "edit"], ["incidents", "execute"],
    ["autoHeal", "view"], ["autoHeal", "execute"],
    ["policies", "view"],
    ["reports", "view"],
  ],
  security_analyst: [
    ["dashboard", "view"],
    ["devices", "view"],
    ["inventory", "view"],
    ["compliance", "view"], ["compliance", "edit"],
    ["incidents", "view"], ["incidents", "edit"],
    ["autoHeal", "view"],
    ["policies", "view"], ["policies", "edit"],
    ["reports", "view"], ["reports", "create"],
    ["settings", "view"],
  ],
  read_only: [
    ["dashboard", "view"],
    ["devices", "view"],
    ["inventory", "view"],
    ["compliance", "view"],
    ["incidents", "view"],
    ["autoHeal", "view"],
    ["policies", "view"],
    ["reports", "view"],
  ],
  auditor: [
    ["dashboard", "view"],
    ["devices", "view"],
    ["inventory", "view"],
    ["compliance", "view"],
    ["incidents", "view"],
    ["autoHeal", "view"],
    ["policies", "view"],
    ["reports", "view"], ["reports", "create"],
    ["settings", "view"],
    ["users", "view"],
  ],
};

export async function ensureRbacTables() {
  await query(`
    CREATE TABLE IF NOT EXISTS role_permissions (
      role TEXT NOT NULL,
      module TEXT NOT NULL,
      action TEXT NOT NULL,
      PRIMARY KEY (role, module, action)
    )
  `);

  // super_admin: every module × every action.
  for (const m of RBAC_MODULES) {
    for (const a of RBAC_ACTIONS) {
      await query(
        `INSERT INTO role_permissions (role, module, action) VALUES ($1, $2, $3)
         ON CONFLICT (role, module, action) DO NOTHING`,
        ["super_admin", m, a]
      );
    }
  }

  // The other 5 roles: a defensible, curated operational default.
  for (const [role, grants] of Object.entries(ROLE_GRANTS)) {
    for (const [m, a] of grants) {
      await query(
        `INSERT INTO role_permissions (role, module, action) VALUES ($1, $2, $3)
         ON CONFLICT (role, module, action) DO NOTHING`,
        [role, m, a]
      );
    }
  }

  const existingReadonly = await query("SELECT 1 FROM users WHERE email = $1", ["readonly@aiops.local"]);
  if (existingReadonly.rowCount === 0) {
    // Dev-only seed so RBAC's restriction side (sidebar hiding, 403s) is
    // actually testable — NOT a production credential.
    const passwordHash = await bcrypt.hash("ChangeMe123!", 10);
    await query(
      `INSERT INTO users (email, username, password_hash, display_name, role, created_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      ["readonly@aiops.local", "readonly", passwordHash, "Read Only User", "read_only", Date.now()]
    );
  }
}
