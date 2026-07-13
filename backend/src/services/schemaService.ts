import { query } from "../repositories/dbRepository";

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
