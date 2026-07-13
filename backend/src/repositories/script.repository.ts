import { query } from "./dbRepository";

export async function findScriptLibrary() {
  return query(`
    SELECT id,name,description
    FROM script_library
    ORDER BY id ASC
  `);
}

export async function findLibraryScript(scriptId: number) {
  return query(
    "SELECT script FROM script_library WHERE id=$1",
    [scriptId]
  );
}

export async function createPendingScriptJob(deviceId: string, script: string) {
  return query(
    `INSERT INTO script_jobs(device_id,script,status,created_at)
     VALUES ($1,$2,'PENDING',$3)`,
    [deviceId, script, Date.now()]
  );
}

export async function createPendingScriptJobReturningId(deviceId: string, script: string) {
  return query(
    `INSERT INTO script_jobs(device_id,script,status,created_at)
     VALUES($1,$2,'PENDING',$3)
     RETURNING id`,
    [deviceId, script, Date.now()]
  );
}

export async function findRecentScriptJobs() {
  return query(
    `SELECT id,device_id,status,output,error,created_at,started_at,finished_at
     FROM script_jobs
     ORDER BY id DESC
     LIMIT 50`
  );
}

export async function findScriptApprovals() {
  return query(`
    SELECT
      id as job_id,
      device_id,
      script,
      approval_status as status,
      approval_user as user,
      agent_message as message,
      COALESCE(approved_at,rejected_at) as time,
      created_at
    FROM script_jobs
    WHERE approval_status IS NOT NULL
    ORDER BY COALESCE(approved_at,rejected_at) DESC
    LIMIT 100
  `);
}

export async function findNextPendingJob(deviceId: string) {
  return query(
    `SELECT id, script, timeout
     FROM script_jobs
     WHERE device_id=$1 AND status='PENDING'
     ORDER BY id ASC
     LIMIT 1`,
    [deviceId]
  );
}

export async function markJobRunning(jobId: number) {
  return query(
    "UPDATE script_jobs SET status='RUNNING', started_at=$1 WHERE id=$2",
    [Date.now(), jobId]
  );
}

export async function appendJobOutput(jobId: number, chunk: string) {
  return query(
    `UPDATE script_jobs
     SET output = COALESCE(output,'') || $1
     WHERE id=$2`,
    [chunk, jobId]
  );
}

export async function updateJobResult(
  jobId: number,
  status: "SUCCESS" | "FAILED",
  output: string,
  error: string,
  finishedAt: number
) {
  return query(
    `UPDATE script_jobs
     SET status=$1,
         output=$2,
         error=$3,
         finished_at=$4
     WHERE id=$5`,
    [status, output, error, finishedAt, jobId]
  );
}

export async function approveJob(jobId: number, time: number, user: string) {
  return query(
    `UPDATE script_jobs
       SET approval_status='APPROVED',
           approved_at=$2,
           approval_user=$3
       WHERE id=$1`,
    [jobId, time, user]
  );
}

export async function rejectJob(
  jobId: number,
  time: number,
  user: string,
  message: string
) {
  return query(
    `UPDATE script_jobs
       SET approval_status='REJECTED',
           rejected_at=$2,
           approval_user=$3,
           agent_message=$4,
           status='FAILED',
           finished_at=$2
       WHERE id=$1`,
    [jobId, time, user, message]
  );
}
