import { query } from "./db.repository";

export async function findRebootPolicies() {
  return query("SELECT * FROM reboot_policies");
}

export async function findDeviceRebootFacts(deviceId: string) {
  return query(
    `SELECT
       d.id AS device_id,
       d.boot_time,
       d.state,
       d.last_seen,
       d.cpu,
       d.ram,
       du.registry_reboot_pending,
       du.device_class,
       du.windows_update_status,
       du.pending_updates,
       du.failed_updates
     FROM devices d
     LEFT JOIN device_updates du ON du.device_id = d.id
     WHERE d.id = $1`,
    [deviceId]
  );
}

export async function insertRebootHistoryRow(entry: {
  deviceId: string;
  previousBootTime: number | null;
  newBootTime: number;
  uptimeBeforeRebootMs: number | null;
  detectedAt: number;
}) {
  return query(
    `INSERT INTO device_reboot_history
     (device_id, previous_boot_time, new_boot_time, uptime_before_reboot_ms, detected_at)
     VALUES ($1,$2,$3,$4,$5)`,
    [
      entry.deviceId,
      entry.previousBootTime,
      entry.newBootTime,
      entry.uptimeBeforeRebootMs,
      entry.detectedAt,
    ]
  );
}

export async function findDeviceRebootHistory(deviceId: string) {
  return query(
    `SELECT * FROM device_reboot_history
     WHERE device_id=$1
     ORDER BY detected_at DESC
     LIMIT 50`,
    [deviceId]
  );
}

// "Due" vs "overdue" is a simple rule-based split (1x-1.5x the policy
// threshold vs. beyond 1.5x), not a modeled/learned boundary — kept
// alongside the query so the ratio is easy to find and adjust.
const DUE_RATIO = 1;
const OVERDUE_RATIO = 1.5;

export async function findFleetRebootSummary() {
  return query(
    `WITH device_uptime AS (
       SELECT
         d.id,
         d.boot_time,
         COALESCE(du.device_class, 'unknown') AS device_class,
         COALESCE(du.registry_reboot_pending, false) AS registry_reboot_pending,
         CASE WHEN d.boot_time IS NOT NULL
           THEN ($1::bigint - d.boot_time) / 86400000.0
           ELSE NULL
         END AS days_since_restart
       FROM devices d
       LEFT JOIN device_updates du ON du.device_id = d.id
     ),
     with_policy AS (
       SELECT
         du.*,
         COALESCE(rp.max_uptime_days, rp_fallback.max_uptime_days) AS max_uptime_days
       FROM device_uptime du
       LEFT JOIN reboot_policies rp ON rp.device_class = du.device_class
       LEFT JOIN reboot_policies rp_fallback ON rp_fallback.device_class = 'unknown'
     )
     SELECT
       COUNT(*) FILTER (
         WHERE days_since_restart IS NOT NULL
           AND days_since_restart <= max_uptime_days * ${DUE_RATIO}
           AND NOT registry_reboot_pending
       ) AS healthy,
       COUNT(*) FILTER (
         WHERE days_since_restart IS NOT NULL
           AND days_since_restart > max_uptime_days * ${DUE_RATIO}
           AND days_since_restart <= max_uptime_days * ${OVERDUE_RATIO}
       ) AS due,
       COUNT(*) FILTER (
         WHERE days_since_restart IS NOT NULL
           AND days_since_restart > max_uptime_days * ${OVERDUE_RATIO}
       ) AS overdue,
       COUNT(*) FILTER (WHERE registry_reboot_pending) AS pending_restart,
       ROUND(AVG(days_since_restart)::numeric, 1) AS avg_uptime_days,
       ROUND(MAX(days_since_restart)::numeric, 1) AS highest_uptime_days,
       ROUND(MIN(days_since_restart)::numeric, 1) AS lowest_uptime_days,
       COUNT(*) FILTER (
         WHERE days_since_restart IS NOT NULL
           AND (days_since_restart > max_uptime_days * ${DUE_RATIO} OR registry_reboot_pending)
       ) AS recommended_today
     FROM with_policy`,
    [Date.now()]
  );
}
