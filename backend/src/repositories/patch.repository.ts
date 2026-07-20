import { query } from "./db.repository";

export async function createPendingPatchJob(
  deviceId: string,
  action: string,
  relatedJobId: number | null,
  requestedBy: string | null
) {
  return query(
    `INSERT INTO patch_jobs(device_id, action, status, related_job_id, requested_by, created_at)
     VALUES ($1, $2, 'PENDING', $3, $4, $5)
     RETURNING id`,
    [deviceId, action, relatedJobId, requestedBy, Date.now()]
  );
}

export async function findNextPendingPatchJob(deviceId: string) {
  return query(
    `SELECT id, action, timeout, created_at, related_job_id
     FROM patch_jobs
     WHERE device_id=$1 AND status='PENDING'
     ORDER BY id ASC
     LIMIT 1`,
    [deviceId]
  );
}

export async function markPatchJobRunning(jobId: number) {
  return query(
    `UPDATE patch_jobs SET status='QUEUED', started_at=$1 WHERE id=$2`,
    [Date.now(), jobId]
  );
}

export async function findPatchJobById(jobId: number) {
  return query(`SELECT * FROM patch_jobs WHERE id=$1`, [jobId]);
}

export async function findRecentPatchJobs(deviceId?: string) {
  if (deviceId) {
    return query(
      `SELECT * FROM patch_jobs WHERE device_id=$1 ORDER BY id DESC LIMIT 50`,
      [deviceId]
    );
  }
  return query(`SELECT * FROM patch_jobs ORDER BY id DESC LIMIT 50`);
}

export async function updatePatchJobProgress(
  jobId: number,
  status: string,
  percentComplete: number | null,
  currentStepDetail: string | null
) {
  return query(
    `UPDATE patch_jobs
     SET status=$1, percent_complete=$2, current_step_detail=$3
     WHERE id=$4`,
    [status, percentComplete, currentStepDetail, jobId]
  );
}

export async function updatePatchJobTerminal(
  jobId: number,
  status: string,
  fields: {
    updatesTotal?: number | null;
    updatesProcessed?: number | null;
    updatesFailed?: number | null;
    rebootRequired?: boolean;
    error?: string | null;
  }
) {
  return query(
    `UPDATE patch_jobs
     SET status=$1,
         updates_total=COALESCE($2, updates_total),
         updates_processed=COALESCE($3, updates_processed),
         updates_failed=COALESCE($4, updates_failed),
         reboot_required=COALESCE($5, reboot_required),
         error=$6,
         percent_complete=100,
         finished_at=$7
     WHERE id=$8`,
    [
      status,
      fields.updatesTotal ?? null,
      fields.updatesProcessed ?? null,
      fields.updatesFailed ?? null,
      fields.rebootRequired ?? null,
      fields.error ?? null,
      Date.now(),
      jobId,
    ]
  );
}

export async function cancelPendingPatchJob(jobId: number) {
  return query(
    `UPDATE patch_jobs
     SET status='CANCELLED', finished_at=$1
     WHERE id=$2 AND status IN ('PENDING','QUEUED','PREPARING','DOWNLOADING')
     RETURNING id`,
    [Date.now(), jobId]
  );
}

export async function insertPatchHistory(entry: {
  deviceId: string;
  patchJobId: number;
  action: string;
  status: string;
  updatesInstalled: number;
  updatesFailed: number;
  rebootRequired: boolean;
  summary: string | null;
}) {
  return query(
    `INSERT INTO patch_history(device_id, patch_job_id, action, status, updates_installed, updates_failed, reboot_required, summary, occurred_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [
      entry.deviceId,
      entry.patchJobId,
      entry.action,
      entry.status,
      entry.updatesInstalled,
      entry.updatesFailed,
      entry.rebootRequired,
      entry.summary,
      Date.now(),
    ]
  );
}

export async function findDevicePatchHistory(deviceId: string) {
  return query(
    `SELECT * FROM patch_history WHERE device_id=$1 ORDER BY occurred_at DESC LIMIT 50`,
    [deviceId]
  );
}

export async function findFleetPatchSummary() {
  const [updates, jobs] = await Promise.all([
    query(`
      SELECT
        COUNT(*) FILTER (WHERE COALESCE(pending_updates, 0) = 0 AND COALESCE(failed_updates, 0) = 0) AS up_to_date,
        COUNT(*) FILTER (WHERE COALESCE(pending_updates, 0) > 0) AS pending,
        COUNT(*) FILTER (WHERE COALESCE(failed_updates, 0) > 0) AS failed
      FROM device_updates
    `),
    query(`
      SELECT COUNT(*) AS active_jobs
      FROM patch_jobs
      WHERE status NOT IN ('COMPLETED','FAILED','CANCELLED')
    `),
  ]);

  return {
    upToDate: Number(updates.rows[0]?.up_to_date ?? 0),
    pending: Number(updates.rows[0]?.pending ?? 0),
    failed: Number(updates.rows[0]?.failed ?? 0),
    activeJobs: Number(jobs.rows[0]?.active_jobs ?? 0),
  };
}
