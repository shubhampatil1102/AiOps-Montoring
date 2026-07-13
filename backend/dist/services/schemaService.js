"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureInventoryTable = ensureInventoryTable;
exports.ensureRuntimeTables = ensureRuntimeTables;
const dbRepository_1 = require("../repositories/dbRepository");
async function ensureInventoryTable() {
    await (0, dbRepository_1.query)(`
    CREATE TABLE IF NOT EXISTS device_inventory (
      device_id TEXT PRIMARY KEY,
      services_summary JSONB,
      drivers_summary JSONB,
      updated_at BIGINT
    )
  `);
}
async function ensureRuntimeTables() {
    await (0, dbRepository_1.query)(`
    CREATE TABLE IF NOT EXISTS script_library (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      script TEXT NOT NULL
    )
  `);
    await (0, dbRepository_1.query)(`
    CREATE TABLE IF NOT EXISTS heal_rules (
      id SERIAL PRIMARY KEY,
      alert_type TEXT NOT NULL,
      script TEXT NOT NULL,
      auto_enabled BOOLEAN DEFAULT FALSE
    )
  `);
    await (0, dbRepository_1.query)(`
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
    await (0, dbRepository_1.query)(`
    ALTER TABLE alerts
    ADD COLUMN IF NOT EXISTS suggestion_id INTEGER
  `);
    await (0, dbRepository_1.query)(`
    ALTER TABLE alerts
    ADD COLUMN IF NOT EXISTS auto_healed BOOLEAN DEFAULT FALSE
  `);
    await (0, dbRepository_1.query)(`
    ALTER TABLE heal_suggestions
    ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'PENDING'
  `);
    await (0, dbRepository_1.query)(`
    ALTER TABLE device_hardware
    ADD COLUMN IF NOT EXISTS health_score INTEGER
  `);
    await (0, dbRepository_1.query)(`
    ALTER TABLE device_hardware
    ADD COLUMN IF NOT EXISTS risk TEXT
  `);
}
