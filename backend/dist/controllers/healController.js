"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSuggestions = getSuggestions;
exports.approveSuggestion = approveSuggestion;
exports.rejectSuggestion = rejectSuggestion;
exports.getHealTimeline = getHealTimeline;
const dbRepository_1 = require("../repositories/dbRepository");
async function getSuggestions(_, res) {
    const r = await (0, dbRepository_1.query)(`SELECT *,
      to_timestamp(created_at/1000) as created_readable
     FROM heal_suggestions
     WHERE status='PENDING'
     ORDER BY created_at DESC`);
    res.send(r.rows);
}
async function approveSuggestion(req, res) {
    const s = await (0, dbRepository_1.query)("SELECT * FROM heal_suggestions WHERE id=$1", [req.params.id]);
    if (!s.rows[0])
        return res.sendStatus(404);
    const sug = s.rows[0];
    await (0, dbRepository_1.query)("UPDATE heal_suggestions SET status='APPROVED' WHERE id=$1", [sug.id]);
    await (0, dbRepository_1.query)(`INSERT INTO script_jobs(device_id,script,status,created_at)
     VALUES($1,$2,'PENDING',$3)`, [sug.device_id, sug.script, Date.now()]);
    res.send({ ok: true });
}
async function rejectSuggestion(req, res) {
    await (0, dbRepository_1.query)("UPDATE heal_suggestions SET status='REJECTED' WHERE id=$1", [req.params.id]);
    res.send({ ok: true });
}
async function getHealTimeline(_, res) {
    const result = await (0, dbRepository_1.query)(`
    SELECT 
      id as job_id,
      device_id,
      script,
      status,
      approval_status,
      approval_user,
      agent_message,
      created_at,
      started_at,
      finished_at,
      COALESCE(approved_at,rejected_at) as decision_time
    FROM script_jobs
    ORDER BY created_at DESC
    LIMIT 100
  `);
    res.send(result.rows);
}
