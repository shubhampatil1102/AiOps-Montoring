"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.findScriptLibrary = findScriptLibrary;
exports.findLibraryScript = findLibraryScript;
exports.createPendingScriptJob = createPendingScriptJob;
exports.createPendingScriptJobReturningId = createPendingScriptJobReturningId;
exports.findRecentScriptJobs = findRecentScriptJobs;
exports.findScriptApprovals = findScriptApprovals;
exports.findNextPendingJob = findNextPendingJob;
exports.markJobRunning = markJobRunning;
exports.appendJobOutput = appendJobOutput;
exports.updateJobResult = updateJobResult;
exports.approveJob = approveJob;
exports.rejectJob = rejectJob;
const dbRepository_1 = require("./dbRepository");
async function findScriptLibrary() {
    return (0, dbRepository_1.query)(`
    SELECT id,name,description
    FROM script_library
    ORDER BY id ASC
  `);
}
async function findLibraryScript(scriptId) {
    return (0, dbRepository_1.query)("SELECT script FROM script_library WHERE id=$1", [scriptId]);
}
async function createPendingScriptJob(deviceId, script) {
    return (0, dbRepository_1.query)(`INSERT INTO script_jobs(device_id,script,status,created_at)
     VALUES ($1,$2,'PENDING',$3)`, [deviceId, script, Date.now()]);
}
async function createPendingScriptJobReturningId(deviceId, script) {
    return (0, dbRepository_1.query)(`INSERT INTO script_jobs(device_id,script,status,created_at)
     VALUES($1,$2,'PENDING',$3)
     RETURNING id`, [deviceId, script, Date.now()]);
}
async function findRecentScriptJobs() {
    return (0, dbRepository_1.query)(`SELECT id,device_id,status,output,error,created_at,started_at,finished_at
     FROM script_jobs
     ORDER BY id DESC
     LIMIT 50`);
}
async function findScriptApprovals() {
    return (0, dbRepository_1.query)(`
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
async function findNextPendingJob(deviceId) {
    return (0, dbRepository_1.query)(`SELECT id, script, timeout
     FROM script_jobs
     WHERE device_id=$1 AND status='PENDING'
     ORDER BY id ASC
     LIMIT 1`, [deviceId]);
}
async function markJobRunning(jobId) {
    return (0, dbRepository_1.query)("UPDATE script_jobs SET status='RUNNING', started_at=$1 WHERE id=$2", [Date.now(), jobId]);
}
async function appendJobOutput(jobId, chunk) {
    return (0, dbRepository_1.query)(`UPDATE script_jobs
     SET output = COALESCE(output,'') || $1
     WHERE id=$2`, [chunk, jobId]);
}
async function updateJobResult(jobId, status, output, error, finishedAt) {
    return (0, dbRepository_1.query)(`UPDATE script_jobs
     SET status=$1,
         output=$2,
         error=$3,
         finished_at=$4
     WHERE id=$5`, [status, output, error, finishedAt, jobId]);
}
async function approveJob(jobId, time, user) {
    return (0, dbRepository_1.query)(`UPDATE script_jobs
       SET approval_status='APPROVED',
           approved_at=$2,
           approval_user=$3
       WHERE id=$1`, [jobId, time, user]);
}
async function rejectJob(jobId, time, user, message) {
    return (0, dbRepository_1.query)(`UPDATE script_jobs
       SET approval_status='REJECTED',
           rejected_at=$2,
           approval_user=$3,
           agent_message=$4,
           status='FAILED',
           finished_at=$2
       WHERE id=$1`, [jobId, time, user, message]);
}
