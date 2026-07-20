import { query } from "./db.repository";

export async function insertMetricSamples(
  rows: { deviceId: string; metricName: string; value: number; collectedAt: number }[]
) {
  if (rows.length === 0) return;

  const values: string[] = [];
  const params: (string | number)[] = [];

  rows.forEach((row, i) => {
    const base = i * 4;
    values.push(`($${base + 1},$${base + 2},$${base + 3},$${base + 4})`);
    params.push(row.deviceId, row.metricName, row.value, row.collectedAt);
  });

  await query(
    `INSERT INTO metric_samples (device_id, metric_name, value, collected_at)
     VALUES ${values.join(",")}`,
    params
  );
}

export async function findMetricDefinitions() {
  return query("SELECT * FROM metric_definitions ORDER BY metric_name");
}

export async function findMetricSamplesSince(deviceId: string, metricName: string, since: number) {
  return query(
    `SELECT value, collected_at FROM metric_samples
     WHERE device_id=$1 AND metric_name=$2 AND collected_at > $3
     ORDER BY collected_at ASC`,
    [deviceId, metricName, since]
  );
}

export async function findLegacyMetricHistory(deviceId: string, metricName: "cpu" | "ram", since: number) {
  return query(
    `SELECT ${metricName} AS value, time AS collected_at FROM metrics_history
     WHERE id=$1 AND time > $2
     ORDER BY time ASC`,
    [deviceId, since]
  );
}

export async function findMetricSamplesInRange(deviceId: string, metricName: string, from: number, to: number) {
  return query(
    `SELECT value, collected_at FROM metric_samples
     WHERE device_id=$1 AND metric_name=$2 AND collected_at >= $3 AND collected_at < $4
     ORDER BY collected_at ASC`,
    [deviceId, metricName, from, to]
  );
}

export async function findLegacyHistoryInRange(deviceId: string, metricName: "cpu" | "ram", from: number, to: number) {
  return query(
    `SELECT ${metricName} AS value, time AS collected_at FROM metrics_history
     WHERE id=$1 AND time >= $2 AND time < $3
     ORDER BY time ASC`,
    [deviceId, from, to]
  );
}

export async function getBaselineCursor() {
  return query("SELECT last_baseline_at FROM analytics_cursor WHERE id=1");
}

export async function setBaselineCursor(ts: number) {
  await query(
    `INSERT INTO analytics_cursor (id, last_baseline_at) VALUES (1, $1)
     ON CONFLICT (id) DO UPDATE SET last_baseline_at=$1`,
    [ts]
  );
}

export async function findDistinctSampleDevicesAndMetrics(since: number) {
  return query(
    `SELECT DISTINCT device_id, metric_name FROM metric_samples WHERE collected_at > $1`,
    [since]
  );
}

export async function findDistinctLegacyDevices(since: number) {
  return query(
    `SELECT DISTINCT id AS device_id FROM metrics_history WHERE time > $1`,
    [since]
  );
}

export async function upsertHourAggregate(
  deviceId: string,
  metricName: string,
  bucketStart: number,
  avgValue: number,
  minValue: number,
  maxValue: number,
  sampleCount: number
) {
  await query(
    `INSERT INTO metric_aggregates
       (device_id, metric_name, granularity, bucket_start, avg_value, min_value, max_value, sample_count)
     VALUES ($1,$2,'hour',$3,$4,$5,$6,$7)
     ON CONFLICT (device_id, metric_name, granularity, bucket_start)
     DO UPDATE SET
       avg_value=$4, min_value=$5, max_value=$6, sample_count=$7`,
    [deviceId, metricName, bucketStart, avgValue, minValue, maxValue, sampleCount]
  );
}

export async function upsertDayAggregateFromHours(deviceId: string, metricName: string, dayStart: number, dayEnd: number) {
  await query(
    `INSERT INTO metric_aggregates
       (device_id, metric_name, granularity, bucket_start, avg_value, min_value, max_value, sample_count)
     SELECT $1, $2, 'day', $3,
       ROUND(AVG(avg_value)::numeric, 4),
       MIN(min_value),
       MAX(max_value),
       SUM(sample_count)
     FROM metric_aggregates
     WHERE device_id=$1 AND metric_name=$2 AND granularity='hour'
       AND bucket_start >= $3 AND bucket_start < $4
     HAVING COUNT(*) > 0
     ON CONFLICT (device_id, metric_name, granularity, bucket_start)
     DO UPDATE SET
       avg_value=EXCLUDED.avg_value,
       min_value=EXCLUDED.min_value,
       max_value=EXCLUDED.max_value,
       sample_count=EXCLUDED.sample_count`,
    [deviceId, metricName, dayStart, dayEnd]
  );
}

export async function findAggregates(
  deviceId: string,
  metricName: string,
  granularity: "hour" | "day",
  since: number
) {
  return query(
    `SELECT bucket_start, avg_value, min_value, max_value, sample_count
     FROM metric_aggregates
     WHERE device_id=$1 AND metric_name=$2 AND granularity=$3 AND bucket_start > $4
     ORDER BY bucket_start ASC`,
    [deviceId, metricName, granularity, since]
  );
}

export async function findDayAggregatesGroupedByPeriod(
  deviceId: string,
  metricName: string,
  since: number,
  bucketSeconds: number
) {
  return query(
    `SELECT
       FLOOR(bucket_start / $4) * $4 AS bucket_start,
       ROUND(AVG(avg_value)::numeric, 4) AS avg_value,
       MIN(min_value) AS min_value,
       MAX(max_value) AS max_value,
       SUM(sample_count) AS sample_count
     FROM metric_aggregates
     WHERE device_id=$1 AND metric_name=$2 AND granularity='day' AND bucket_start > $3
     GROUP BY FLOOR(bucket_start / $4)
     ORDER BY bucket_start ASC`,
    [deviceId, metricName, since, bucketSeconds]
  );
}

export async function findAverageInRange(
  deviceId: string,
  metricName: string,
  granularity: "hour" | "day",
  from: number,
  to: number
) {
  return query(
    `SELECT ROUND(AVG(avg_value)::numeric, 4) AS avg_value, SUM(sample_count) AS sample_count
     FROM metric_aggregates
     WHERE device_id=$1 AND metric_name=$2 AND granularity=$3
       AND bucket_start >= $4 AND bucket_start < $5`,
    [deviceId, metricName, granularity, from, to]
  );
}

export async function getBaseline(deviceId: string, metricName: string) {
  return query(
    "SELECT * FROM metric_baselines WHERE device_id=$1 AND metric_name=$2",
    [deviceId, metricName]
  );
}

export async function upsertBaseline(
  deviceId: string,
  metricName: string,
  meanValue: number,
  stddevValue: number,
  sampleCount: number,
  updatedAt: number
) {
  await query(
    `INSERT INTO metric_baselines (device_id, metric_name, mean_value, stddev_value, sample_count, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6)
     ON CONFLICT (device_id, metric_name)
     DO UPDATE SET mean_value=$3, stddev_value=$4, sample_count=$5, updated_at=$6`,
    [deviceId, metricName, meanValue, stddevValue, sampleCount, updatedAt]
  );
}

export async function insertAnomaly(
  deviceId: string,
  metricName: string,
  value: number,
  baselineMean: number,
  zScore: number,
  detectedAt: number
) {
  await query(
    `INSERT INTO metric_anomalies (device_id, metric_name, value, baseline_mean, z_score, detected_at)
     VALUES ($1,$2,$3,$4,$5,$6)`,
    [deviceId, metricName, value, baselineMean, zScore, detectedAt]
  );
}

export async function findAnomalies(deviceId: string, metricName: string, since: number) {
  return query(
    `SELECT * FROM metric_anomalies
     WHERE device_id=$1 AND metric_name=$2 AND detected_at > $3
     ORDER BY detected_at DESC`,
    [deviceId, metricName, since]
  );
}

export async function findRetentionPolicies() {
  return query("SELECT * FROM retention_policies");
}

export async function deleteOldMetricSamples(before: number) {
  return query("DELETE FROM metric_samples WHERE collected_at < $1", [before]);
}

export async function deleteOldAggregates(granularity: "hour" | "day", before: number) {
  return query(
    "DELETE FROM metric_aggregates WHERE granularity=$1 AND bucket_start < $2",
    [granularity, before]
  );
}

export async function deleteOldLegacyHistory(before: number) {
  return query("DELETE FROM metrics_history WHERE time < $1", [before]);
}

export async function deleteOldProcesses(before: number) {
  return query("DELETE FROM processes WHERE time < $1", [before]);
}
