import { query } from "./db.repository";

export async function findOrCreateApplication(
  canonicalName: string,
  publisher: string | null,
  category: string,
  pluginId: string | null,
  cloudProvider: string | null
) {
  const now = Date.now();

  const existing = await query<{ id: number }>(
    `SELECT id FROM applications WHERE canonical_name=$1 AND publisher IS NOT DISTINCT FROM $2`,
    [canonicalName, publisher]
  );

  if (existing.rows[0]) {
    await query(
      `UPDATE applications SET category=$1, plugin_id=$2, cloud_provider=$3, updated_at=$4 WHERE id=$5`,
      [category, pluginId, cloudProvider, now, existing.rows[0].id]
    );
    return existing.rows[0].id;
  }

  const inserted = await query<{ id: number }>(
    `INSERT INTO applications (canonical_name, publisher, category, plugin_id, cloud_provider, created_at, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$6)
     ON CONFLICT (canonical_name, publisher) DO UPDATE SET updated_at=$6
     RETURNING id`,
    [canonicalName, publisher, category, pluginId, cloudProvider, now]
  );
  return inserted.rows[0].id;
}

// Enriches the base row with fleet-wide aggregates (device/running counts,
// avg health, cloud status) needed by the All Applications grid — extends
// the existing query rather than adding a parallel one, so every existing
// caller (useApplications()) just gets more fields, nothing breaks.
export async function findApplications() {
  return query(`
    SELECT
      a.*,
      COALESCE(inv.device_count, 0) AS device_count,
      COALESCE(proc.running_count, 0) AS running_count,
      health.avg_health_score,
      cs.status AS cloud_status
    FROM applications a
    LEFT JOIN (
      SELECT application_id, COUNT(DISTINCT device_id) AS device_count
      FROM application_inventory WHERE removed_at IS NULL GROUP BY application_id
    ) inv ON inv.application_id = a.id
    LEFT JOIN (
      SELECT application_id, COUNT(DISTINCT device_id) AS running_count
      FROM application_processes WHERE application_id IS NOT NULL GROUP BY application_id
    ) proc ON proc.application_id = a.id
    LEFT JOIN (
      SELECT application_id, ROUND(AVG(health_score)) AS avg_health_score
      FROM application_health GROUP BY application_id
    ) health ON health.application_id = a.id
    LEFT JOIN cloud_services cs ON cs.provider = a.cloud_provider
    ORDER BY a.canonical_name ASC
  `);
}

export async function findApplicationCategories() {
  return query(`SELECT DISTINCT category FROM applications ORDER BY category ASC`);
}

export async function findApplicationById(applicationId: number) {
  return query(`SELECT * FROM applications WHERE id=$1`, [applicationId]);
}

export async function findApplicationAggregateStats(applicationId: number) {
  return query(
    `SELECT
       (SELECT COUNT(DISTINCT device_id) FROM application_inventory WHERE application_id=$1 AND removed_at IS NULL) AS device_count,
       (SELECT COUNT(DISTINCT device_id) FROM application_processes WHERE application_id=$1) AS running_count,
       (SELECT ROUND(AVG(health_score)) FROM application_health WHERE application_id=$1) AS avg_health_score,
       (SELECT COUNT(*) FROM application_processes WHERE application_id=$1 AND signed = false) AS unsigned_process_count`,
    [applicationId]
  );
}

// Per-device breakdown for one application, across the whole fleet —
// distinct from findDeviceInventory() (which is the reverse: all
// applications on one device).
export async function findApplicationDeviceBreakdown(applicationId: number) {
  return query(
    `SELECT
       d.id AS device_id,
       d.state,
       d.last_seen,
       ai.version,
       ai.install_date,
       ai.install_location,
       ai.architecture,
       ai.uninstall_command,
       ai.product_code,
       ai.last_seen_at AS inventory_last_seen,
       ah.health_score,
       ah.level,
       EXISTS(
         SELECT 1 FROM application_processes ap WHERE ap.device_id = d.id AND ap.application_id = $1
       ) AS is_running,
       (SELECT SUM(ap.cpu_percent) FROM application_processes ap WHERE ap.device_id = d.id AND ap.application_id = $1) AS cpu_percent,
       (SELECT SUM(ap.memory_mb) FROM application_processes ap WHERE ap.device_id = d.id AND ap.application_id = $1) AS memory_mb
     FROM application_inventory ai
     JOIN devices d ON d.id = ai.device_id
     LEFT JOIN application_health ah ON ah.device_id = d.id AND ah.application_id = ai.application_id
     WHERE ai.application_id = $1 AND ai.removed_at IS NULL
     ORDER BY d.id ASC`,
    [applicationId]
  );
}

// Fleet-wide history for one application (all devices) — distinct from
// findDeviceApplicationHistory() (one device, all/one application).
export async function findApplicationHistoryFleetWide(applicationId: number) {
  return query(
    `SELECT * FROM application_history WHERE application_id=$1 ORDER BY occurred_at DESC LIMIT 200`,
    [applicationId]
  );
}

export async function findApplicationHealthHistory(applicationId: number, since: number) {
  return query(
    `SELECT device_id, health_score, recorded_at FROM application_health_history
     WHERE application_id=$1 AND recorded_at > $2
     ORDER BY recorded_at ASC`,
    [applicationId, since]
  );
}

export async function findMostInstalledApplications(limit = 10) {
  return query(
    `SELECT a.id, a.canonical_name, a.category, COUNT(DISTINCT ai.device_id) AS device_count
     FROM applications a
     JOIN application_inventory ai ON ai.application_id = a.id AND ai.removed_at IS NULL
     GROUP BY a.id
     ORDER BY device_count DESC
     LIMIT $1`,
    [limit]
  );
}

export async function findMostVersionChangedApplications(limit = 10) {
  return query(
    `SELECT a.id, a.canonical_name, COUNT(*) AS change_count
     FROM application_history h
     JOIN applications a ON a.id = h.application_id
     WHERE h.event_type = 'VERSION_CHANGED'
     GROUP BY a.id
     ORDER BY change_count DESC
     LIMIT $1`,
    [limit]
  );
}

export async function findMostServiceRestartsApplications(limit = 10) {
  return query(
    `SELECT a.id, a.canonical_name, SUM(s.restart_count) AS total_restarts
     FROM application_services s
     JOIN applications a ON a.id = s.application_id
     GROUP BY a.id
     HAVING SUM(s.restart_count) > 0
     ORDER BY total_restarts DESC
     LIMIT $1`,
    [limit]
  );
}

export async function findRecentlyInstalledApplications(limit = 10) {
  return query(
    `SELECT h.*, a.canonical_name
     FROM application_history h
     JOIN applications a ON a.id = h.application_id
     WHERE h.event_type = 'INSTALLED'
     ORDER BY h.occurred_at DESC
     LIMIT $1`,
    [limit]
  );
}

export async function findUnsignedProcesses(limit = 20) {
  return query(
    `SELECT DISTINCT ap.device_id, ap.process_name, ap.application_id, a.canonical_name
     FROM application_processes ap
     LEFT JOIN applications a ON a.id = ap.application_id
     WHERE ap.signed = false
     LIMIT $1`,
    [limit]
  );
}

export async function findProcessByPid(deviceId: string, pid: number) {
  return query(
    `SELECT * FROM application_processes WHERE device_id=$1 AND pid=$2`,
    [deviceId, pid]
  );
}

export async function findCrashHistoryEvent(deviceId: string, processName: string, occurredAt: number) {
  return query(
    `SELECT id FROM application_history WHERE device_id=$1 AND event_type='CRASH' AND detail=$2 AND occurred_at=$3`,
    [deviceId, processName, occurredAt]
  );
}

export async function countRecentCrashes(deviceId: string, applicationId: number, sinceMs: number) {
  const result = await query<{ count: string }>(
    `SELECT COUNT(*) AS count FROM application_history
     WHERE device_id=$1 AND application_id=$2 AND event_type='CRASH' AND occurred_at > $3`,
    [deviceId, applicationId, sinceMs]
  );
  return Number(result.rows[0]?.count ?? 0);
}

interface InventoryEntry {
  deviceId: string;
  applicationId: number;
  displayName: string;
  version: string | null;
  publisher: string | null;
  installDate: number | null;
  installLocation: string | null;
  architecture: string | null;
  estimatedSizeKb: number | null;
  installSource: string;
  productCode: string;
  uninstallCommand: string | null;
}

export async function upsertInventoryEntry(entry: InventoryEntry) {
  const now = Date.now();

  const existing = await query<{ id: number; version: string | null; publisher: string | null }>(
    `SELECT id, version, publisher FROM application_inventory
     WHERE device_id=$1 AND application_id=$2 AND install_source=$3 AND product_code=$4`,
    [entry.deviceId, entry.applicationId, entry.installSource, entry.productCode]
  );

  if (existing.rows[0]) {
    await query(
      `UPDATE application_inventory
       SET display_name=$1, version=$2, publisher=$3, install_date=$4, install_location=$5,
           architecture=$6, estimated_size_kb=$7, uninstall_command=$8, last_seen_at=$9, removed_at=NULL
       WHERE id=$10`,
      [
        entry.displayName, entry.version, entry.publisher, entry.installDate, entry.installLocation,
        entry.architecture, entry.estimatedSizeKb, entry.uninstallCommand, now, existing.rows[0].id,
      ]
    );

    const versionChanged = entry.version && existing.rows[0].version && entry.version !== existing.rows[0].version;
    const publisherChanged = entry.publisher && existing.rows[0].publisher && entry.publisher !== existing.rows[0].publisher;
    return {
      id: existing.rows[0].id,
      isNew: false,
      versionChanged: Boolean(versionChanged),
      publisherChanged: Boolean(publisherChanged),
      previousPublisher: existing.rows[0].publisher,
    };
  }

  const inserted = await query<{ id: number }>(
    `INSERT INTO application_inventory
     (device_id, application_id, display_name, version, publisher, install_date, install_location,
      architecture, estimated_size_kb, install_source, product_code, uninstall_command, first_seen_at, last_seen_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$13)
     RETURNING id`,
    [
      entry.deviceId, entry.applicationId, entry.displayName, entry.version, entry.publisher,
      entry.installDate, entry.installLocation, entry.architecture, entry.estimatedSizeKb,
      entry.installSource, entry.productCode, entry.uninstallCommand, now,
    ]
  );
  return { id: inserted.rows[0].id, isNew: true, versionChanged: false, publisherChanged: false, previousPublisher: null };
}

export async function findActiveInventoryIds(deviceId: string) {
  return query<{ id: number; application_id: number; display_name: string }>(
    `SELECT id, application_id, display_name FROM application_inventory
     WHERE device_id=$1 AND removed_at IS NULL`,
    [deviceId]
  );
}

export async function markInventoryRemoved(ids: number[], removedAt: number) {
  if (ids.length === 0) return;
  await query(
    `UPDATE application_inventory SET removed_at=$1 WHERE id = ANY($2::int[])`,
    [removedAt, ids]
  );
}

export async function insertHistoryEvent(
  deviceId: string,
  applicationId: number | null,
  eventType: string,
  detail: string | null,
  occurredAt: number
) {
  return query(
    `INSERT INTO application_history (device_id, application_id, event_type, detail, occurred_at)
     VALUES ($1,$2,$3,$4,$5)`,
    [deviceId, applicationId, eventType, detail, occurredAt]
  );
}

export async function findDeviceInventory(deviceId: string) {
  return query(
    `SELECT ai.*, a.canonical_name, a.category, a.plugin_id, a.cloud_provider
     FROM application_inventory ai
     JOIN applications a ON a.id = ai.application_id
     WHERE ai.device_id=$1 AND ai.removed_at IS NULL
     ORDER BY ai.display_name ASC`,
    [deviceId]
  );
}

export async function findDeviceApplicationHistory(deviceId: string, applicationId?: number) {
  if (applicationId) {
    return query(
      `SELECT * FROM application_history WHERE device_id=$1 AND application_id=$2 ORDER BY occurred_at DESC LIMIT 100`,
      [deviceId, applicationId]
    );
  }
  return query(
    `SELECT * FROM application_history WHERE device_id=$1 ORDER BY occurred_at DESC LIMIT 100`,
    [deviceId]
  );
}

// Snapshot semantics — a device's process list is replaced each cycle, not
// accumulated, since application_processes represents "what's running now,"
// not a historical log (application_health_history covers trends instead).
export async function replaceProcessSnapshot(
  deviceId: string,
  processes: Array<{
    applicationId: number | null;
    pid: number;
    parentPid: number | null;
    processName: string;
    exePath: string | null;
    cpuPercent: number | null;
    memoryMb: number | null;
    threads: number | null;
    handles: number | null;
    startTime: number | null;
    owner: string | null;
    responding: boolean | null;
    windowTitle: string | null;
    signed: boolean | null;
    publisher: string | null;
    certIssuer: string | null;
    certExpiresAt: number | null;
    certThumbprint: string | null;
  }>
) {
  const now = Date.now();
  await query(`DELETE FROM application_processes WHERE device_id=$1`, [deviceId]);

  for (const p of processes) {
    await query(
      `INSERT INTO application_processes
       (device_id, application_id, pid, parent_pid, process_name, exe_path, cpu_percent, memory_mb,
        threads, handles, start_time, owner, responding, window_title, signed, publisher,
        cert_issuer, cert_expires_at, cert_thumbprint, collected_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)`,
      [
        deviceId, p.applicationId, p.pid, p.parentPid, p.processName, p.exePath, p.cpuPercent, p.memoryMb,
        p.threads, p.handles, p.startTime, p.owner, p.responding, p.windowTitle, p.signed, p.publisher,
        p.certIssuer, p.certExpiresAt, p.certThumbprint, now,
      ]
    );
  }
}

export async function findDeviceApplicationProcesses(deviceId: string, applicationId?: number) {
  if (applicationId) {
    return query(
      `SELECT * FROM application_processes WHERE device_id=$1 AND application_id=$2 ORDER BY cpu_percent DESC NULLS LAST`,
      [deviceId, applicationId]
    );
  }
  return query(
    `SELECT * FROM application_processes WHERE device_id=$1 ORDER BY cpu_percent DESC NULLS LAST`,
    [deviceId]
  );
}

export async function upsertApplicationHealth(
  deviceId: string,
  applicationId: number,
  healthScore: number,
  level: string,
  breakdown: Record<string, number>
) {
  const now = Date.now();
  await query(
    `INSERT INTO application_health (device_id, application_id, health_score, level, breakdown, updated_at)
     VALUES ($1,$2,$3,$4,$5::jsonb,$6)
     ON CONFLICT (device_id, application_id) DO UPDATE SET
       health_score=$3, level=$4, breakdown=$5::jsonb, updated_at=$6`,
    [deviceId, applicationId, healthScore, level, JSON.stringify(breakdown), now]
  );
  await query(
    `INSERT INTO application_health_history (device_id, application_id, health_score, recorded_at)
     VALUES ($1,$2,$3,$4)`,
    [deviceId, applicationId, healthScore, now]
  );
}

export async function findDeviceApplicationHealth(deviceId: string, applicationId: number) {
  return query(
    `SELECT * FROM application_health WHERE device_id=$1 AND application_id=$2`,
    [deviceId, applicationId]
  );
}

export async function upsertApplicationService(
  deviceId: string,
  applicationId: number,
  serviceName: string,
  displayName: string | null,
  status: string | null,
  startupType: string | null,
  logonAccount: string | null,
  incrementRestartCount: boolean
) {
  const now = Date.now();
  await query(
    `INSERT INTO application_services
       (device_id, application_id, service_name, display_name, status, startup_type, restart_count, logon_account, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
     ON CONFLICT (device_id, application_id, service_name) DO UPDATE SET
       display_name=$4, status=$5, startup_type=$6,
       restart_count = application_services.restart_count + $7,
       logon_account=$8, updated_at=$9`,
    [deviceId, applicationId, serviceName, displayName, status, startupType, incrementRestartCount ? 1 : 0, logonAccount, now]
  );
}

export async function findDeviceApplicationServices(deviceId: string, applicationId?: number) {
  if (applicationId) {
    return query(
      `SELECT * FROM application_services WHERE device_id=$1 AND application_id=$2`,
      [deviceId, applicationId]
    );
  }
  return query(`SELECT * FROM application_services WHERE device_id=$1`, [deviceId]);
}

export async function findFleetApplicationSummary() {
  return query(`
    SELECT
      COUNT(DISTINCT ai.application_id) AS installed_applications,
      COUNT(*) FILTER (WHERE ah.level = 'Healthy' OR ah.level = 'Good') AS healthy,
      COUNT(*) FILTER (WHERE ah.level = 'Warning') AS warning,
      COUNT(*) FILTER (WHERE ah.level = 'Critical') AS critical
    FROM application_inventory ai
    LEFT JOIN application_health ah ON ah.device_id = ai.device_id AND ah.application_id = ai.application_id
    WHERE ai.removed_at IS NULL
  `);
}

export async function findPublisherBreakdown() {
  return query(`
    SELECT
      COALESCE(a.publisher, 'Unknown') AS publisher,
      COUNT(DISTINCT a.id) AS application_count,
      COUNT(DISTINCT ai.device_id) AS device_count
    FROM applications a
    JOIN application_inventory ai ON ai.application_id = a.id AND ai.removed_at IS NULL
    GROUP BY COALESCE(a.publisher, 'Unknown')
    ORDER BY device_count DESC
  `);
}

export async function findCategoryBreakdown() {
  return query(`
    SELECT
      a.category,
      COUNT(DISTINCT a.id) AS application_count,
      COUNT(DISTINCT ai.device_id) AS device_count
    FROM applications a
    JOIN application_inventory ai ON ai.application_id = a.id AND ai.removed_at IS NULL
    GROUP BY a.category
    ORDER BY device_count DESC
  `);
}

export async function findTopResourceConsumers(limit = 5) {
  const [cpu, memory] = await Promise.all([
    query(
      `SELECT device_id, process_name, cpu_percent FROM application_processes
       WHERE cpu_percent IS NOT NULL ORDER BY cpu_percent DESC LIMIT $1`,
      [limit]
    ),
    query(
      `SELECT device_id, process_name, memory_mb FROM application_processes
       WHERE memory_mb IS NOT NULL ORDER BY memory_mb DESC LIMIT $1`,
      [limit]
    ),
  ]);
  return { topCpu: cpu.rows, topMemory: memory.rows };
}
