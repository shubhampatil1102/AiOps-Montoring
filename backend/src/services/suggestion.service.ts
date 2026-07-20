import { query } from "../repositories/db.repository";

export async function createSuggestion(
  device_id: string,
  type: string,
  reason: string,
  action: string,
  script: string
) {
  const result = await query(
    `INSERT INTO heal_suggestions(device_id,alert_type,reason,suggested_action,script,created_at)
     VALUES($1,$2,$3,$4,$5,$6) RETURNING id`,
    [device_id, type, reason, action, script, Date.now()]
  );

  return result.rows[0].id;
}
export async function fetchSuggestions() {
  const result = await query(`
    SELECT
      id,
      device_id,
      alert_type,
      reason,
      suggested_action,
      script,
      created_at
    FROM heal_suggestions
    ORDER BY created_at DESC
    LIMIT 20
  `);

  return result.rows;
}
