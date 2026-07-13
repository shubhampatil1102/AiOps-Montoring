"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getScriptLibrary = getScriptLibrary;
exports.runLibraryScript = runLibraryScript;
exports.runScript = runScript;
exports.getScriptJobs = getScriptJobs;
exports.getScriptApprovals = getScriptApprovals;
exports.pullAgentJob = pullAgentJob;
exports.appendAgentJobLog = appendAgentJobLog;
exports.saveAgentJobResult = saveAgentJobResult;
exports.saveAgentApproval = saveAgentApproval;
const dbRepository_1 = require("../repositories/dbRepository");
const logger_service_1 = require("../services/logger.service");
async function getScriptLibrary(_, res) {
    const r = await (0, dbRepository_1.query)(`
    SELECT id,name,description
    FROM script_library
    ORDER BY id ASC
  `);
    res.send(r.rows);
}
async function runLibraryScript(req, res) {
    const { device, script_id } = req.body;
    if (!device || !script_id)
        return res.status(400).send({ error: "device & script_id required" });
    const script = await (0, dbRepository_1.query)("SELECT script FROM script_library WHERE id=$1", [script_id]);
    if (!script.rows.length)
        return res.status(404).send({ error: "Script not found" });
    await (0, dbRepository_1.query)(`INSERT INTO script_jobs(device_id,script,status,created_at)
     VALUES ($1,$2,'PENDING',$3)`, [device, script.rows[0].script, Date.now()]);
    res.send({ ok: true });
}
async function runScript(req, res) {
    if (!req.body || !req.body.device_id || !req.body.script)
        return res.status(400).send({ error: "device_id & script required" });
    const { device_id, script } = req.body;
    const r = await (0, dbRepository_1.query)(`INSERT INTO script_jobs(device_id,script,status,created_at)
     VALUES($1,$2,'PENDING',$3)
     RETURNING id`, [device_id.trim(), script, Date.now()]);
    logger_service_1.Logger.info("JOB CREATED:", r.rows[0].id, "for", device_id);
    res.send({ job_id: r.rows[0].id });
}
async function getScriptJobs(_, res) {
    const r = await (0, dbRepository_1.query)(`SELECT id,device_id,status,output,error,created_at,started_at,finished_at
     FROM script_jobs
     ORDER BY id DESC
     LIMIT 50`);
    res.send(r.rows);
}
async function getScriptApprovals(_, res) {
    const result = await (0, dbRepository_1.query)(`
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
    res.send(result.rows);
}
async function pullAgentJob(req, res) {
    const r = await (0, dbRepository_1.query)(`SELECT id, script, timeout
     FROM script_jobs
     WHERE device_id=$1 AND status='PENDING'
     ORDER BY id ASC
     LIMIT 1`, [req.params.deviceId]);
    if (r.rows.length === 0)
        return res.send({});
    const job = r.rows[0];
    await (0, dbRepository_1.query)("UPDATE script_jobs SET status='RUNNING', started_at=$1 WHERE id=$2", [Date.now(), job.id]);
    res.send({
        job_id: job.id,
        script: job.script,
        timeout: job.timeout || 120
    });
}
async function appendAgentJobLog(req, res) {
    const { job_id, chunk } = req.body;
    if (!job_id || chunk === undefined)
        return res.status(400).send({ error: "invalid log payload" });
    await (0, dbRepository_1.query)(`UPDATE script_jobs
     SET output = COALESCE(output,'') || $1
     WHERE id=$2`, [chunk, job_id]);
    res.send({ ok: true });
}
async function saveAgentJobResult(req, res) {
    let { job_id, success, output, error } = req.body;
    success = success === true || success === "true";
    logger_service_1.Logger.info("JOB RESULT:", job_id, success);
    const finishedTime = Date.now();
    await (0, dbRepository_1.query)(`UPDATE script_jobs
     SET status=$1,
         output=$2,
         error=$3,
         finished_at=$4
     WHERE id=$5`, [
        success ? "SUCCESS" : "FAILED",
        output ?? "",
        error ?? "",
        finishedTime,
        job_id
    ]);
    res.send({ ok: true });
}
async function saveAgentApproval(req, res) {
    const { job_id, status, user, message = "", time } = req.body;
    logger_service_1.Logger.info("APPROVAL RECEIVED:", job_id, status);
    if (!job_id || !status)
        return res.status(400).send({ error: "Invalid approval payload" });
    if (status === "APPROVED") {
        await (0, dbRepository_1.query)(`UPDATE script_jobs
       SET approval_status='APPROVED',
           approved_at=$2,
           approval_user=$3
       WHERE id=$1`, [job_id, time, user]);
    }
    else if (status === "REJECTED") {
        await (0, dbRepository_1.query)(`UPDATE script_jobs
       SET approval_status='REJECTED',
           rejected_at=$2,
           approval_user=$3,
           agent_message=$4,
           status='FAILED',
           finished_at=$2
       WHERE id=$1`, [job_id, time, user, message]);
    }
    res.send({ ok: true });
}
