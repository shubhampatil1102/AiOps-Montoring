import { query } from "./db.repository";

export interface DependencyNodeUpsert {
  deviceId: string;
  applicationId: number | null;
  nodeType: string;
  nodeKey: string;
  displayName: string;
  status: string | null;
  metadata: Record<string, unknown> | null;
}

// Upserts a dependency artifact (scheduled task, startup item, driver,
// network endpoint, DNS record, auth provider) keyed on (device_id,
// node_type, node_key). Mirrors upsertInventoryEntry's
// "update in place, clear removed_at" shape.
export async function upsertDependencyNode(node: DependencyNodeUpsert) {
  const now = Date.now();

  const existing = await query<{ id: number; status: string | null }>(
    `SELECT id, status FROM dependency_nodes WHERE device_id=$1 AND node_type=$2 AND node_key=$3`,
    [node.deviceId, node.nodeType, node.nodeKey]
  );

  if (existing.rows[0]) {
    await query(
      `UPDATE dependency_nodes
       SET application_id=$1, display_name=$2, status=$3, metadata=$4::jsonb, last_seen_at=$5, removed_at=NULL
       WHERE id=$6`,
      [node.applicationId, node.displayName, node.status, JSON.stringify(node.metadata ?? {}), now, existing.rows[0].id]
    );
    return { id: existing.rows[0].id, isNew: false, previousStatus: existing.rows[0].status };
  }

  const inserted = await query<{ id: number }>(
    `INSERT INTO dependency_nodes
       (device_id, application_id, node_type, node_key, display_name, status, metadata, first_seen_at, last_seen_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8,$8)
     RETURNING id`,
    [node.deviceId, node.applicationId, node.nodeType, node.nodeKey, node.displayName, node.status, JSON.stringify(node.metadata ?? {}), now]
  );
  return { id: inserted.rows[0].id, isNew: true, previousStatus: null };
}

export async function findActiveDependencyNodeIds(deviceId: string, nodeType: string) {
  return query<{ id: number; application_id: number | null; node_key: string; display_name: string }>(
    `SELECT id, application_id, node_key, display_name FROM dependency_nodes
     WHERE device_id=$1 AND node_type=$2 AND removed_at IS NULL`,
    [deviceId, nodeType]
  );
}

export async function markDependencyNodesRemoved(ids: number[], removedAt: number) {
  if (ids.length === 0) return;
  await query(`UPDATE dependency_nodes SET removed_at=$1 WHERE id = ANY($2::int[])`, [removedAt, ids]);
}

export async function findDependencyNodeByKey(deviceId: string, nodeType: string, nodeKey: string) {
  return query(
    `SELECT * FROM dependency_nodes WHERE device_id=$1 AND node_type=$2 AND node_key=$3 AND removed_at IS NULL`,
    [deviceId, nodeType, nodeKey]
  );
}

export async function findDeviceDependencyNodes(deviceId: string, nodeType: string, applicationId?: number) {
  if (applicationId !== undefined) {
    return query(
      `SELECT * FROM dependency_nodes WHERE device_id=$1 AND node_type=$2 AND application_id=$3 AND removed_at IS NULL`,
      [deviceId, nodeType, applicationId]
    );
  }
  return query(
    `SELECT * FROM dependency_nodes WHERE device_id=$1 AND node_type=$2 AND removed_at IS NULL ORDER BY display_name ASC`,
    [deviceId, nodeType]
  );
}

export async function upsertDependencyEdge(
  deviceId: string,
  applicationId: number | null,
  fromType: string,
  fromKey: string,
  toType: string,
  toKey: string,
  relationType: string
) {
  const now = Date.now();
  await query(
    `INSERT INTO dependency_edges
       (device_id, application_id, from_type, from_key, to_type, to_key, relation_type, created_at, last_seen_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$8)
     ON CONFLICT (device_id, from_type, from_key, to_type, to_key, relation_type)
     DO UPDATE SET last_seen_at=$8, application_id=$2`,
    [deviceId, applicationId, fromType, fromKey, toType, toKey, relationType, now]
  );
}

export async function findDeviceDependencyEdges(deviceId: string, applicationId?: number) {
  if (applicationId !== undefined) {
    return query(
      `SELECT * FROM dependency_edges WHERE device_id=$1 AND application_id=$2`,
      [deviceId, applicationId]
    );
  }
  return query(`SELECT * FROM dependency_edges WHERE device_id=$1`, [deviceId]);
}

export async function upsertDependencyHealth(
  deviceId: string,
  nodeType: string,
  nodeKey: string,
  applicationId: number | null,
  healthScore: number,
  level: string,
  breakdown: Record<string, number>
) {
  const now = Date.now();
  await query(
    `INSERT INTO dependency_health (device_id, node_type, node_key, application_id, health_score, level, breakdown, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8)
     ON CONFLICT (device_id, node_type, node_key) DO UPDATE SET
       application_id=$4, health_score=$5, level=$6, breakdown=$7::jsonb, updated_at=$8`,
    [deviceId, nodeType, nodeKey, applicationId, healthScore, level, JSON.stringify(breakdown), now]
  );
}

export async function findDeviceDependencyHealth(deviceId: string, applicationId?: number) {
  if (applicationId !== undefined) {
    return query(
      `SELECT * FROM dependency_health WHERE device_id=$1 AND application_id=$2`,
      [deviceId, applicationId]
    );
  }
  return query(`SELECT * FROM dependency_health WHERE device_id=$1`, [deviceId]);
}

export async function insertDependencyEvent(
  deviceId: string,
  applicationId: number | null,
  nodeType: string | null,
  nodeKey: string | null,
  eventType: string,
  detail: string | null,
  occurredAt: number
) {
  return query(
    `INSERT INTO dependency_events (device_id, application_id, node_type, node_key, event_type, detail, occurred_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    [deviceId, applicationId, nodeType, nodeKey, eventType, detail, occurredAt]
  );
}

export async function findDeviceDependencyEvents(deviceId: string, applicationId?: number, limit = 100) {
  if (applicationId !== undefined) {
    return query(
      `SELECT * FROM dependency_events WHERE device_id=$1 AND application_id=$2 ORDER BY occurred_at DESC LIMIT $3`,
      [deviceId, applicationId, limit]
    );
  }
  return query(
    `SELECT * FROM dependency_events WHERE device_id=$1 ORDER BY occurred_at DESC LIMIT $2`,
    [deviceId, limit]
  );
}
