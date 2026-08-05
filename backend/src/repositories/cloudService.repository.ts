import { query } from "./db.repository";

export async function upsertProviderStatus(provider: string, displayName: string, status: string, statusUrl: string) {
  const now = Date.now();
  await query(
    `INSERT INTO cloud_services (provider, display_name, status, status_url, updated_at)
     VALUES ($1,$2,$3,$4,$5)
     ON CONFLICT (provider) DO UPDATE SET
       display_name=$2, status=$3, status_url=$4, updated_at=$5`,
    [provider, displayName, status, statusUrl, now]
  );
}

export async function replaceProviderIncidents(
  provider: string,
  incidents: Array<{
    externalId: string;
    title: string;
    severity: string | null;
    affectedServices: string | null;
    startedAt: number | null;
    updatedAt: number | null;
    resolvedAt: number | null;
    statusUrl: string | null;
  }>
) {
  // Only unresolved incidents are kept live — resolved ones are dropped
  // from the active table on the next poll (cloud_incidents is a current-
  // state cache, not an audit log; the source status pages remain the
  // historical record).
  await query(`DELETE FROM cloud_incidents WHERE provider=$1`, [provider]);

  for (const incident of incidents) {
    if (incident.resolvedAt) continue;
    await query(
      `INSERT INTO cloud_incidents
       (provider, external_id, title, severity, affected_services, started_at, updated_at, resolved_at, status_url)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [
        provider, incident.externalId, incident.title, incident.severity, incident.affectedServices,
        incident.startedAt, incident.updatedAt, incident.resolvedAt, incident.statusUrl,
      ]
    );
  }
}

export async function findAllProviderStatus() {
  return query(`SELECT * FROM cloud_services ORDER BY display_name ASC`);
}

export async function findProviderStatus(provider: string) {
  return query(`SELECT * FROM cloud_services WHERE provider=$1`, [provider]);
}

export async function findAllIncidents() {
  return query(`SELECT * FROM cloud_incidents ORDER BY started_at DESC`);
}

export async function findProviderIncidents(provider: string) {
  return query(`SELECT * FROM cloud_incidents WHERE provider=$1 ORDER BY started_at DESC`, [provider]);
}
