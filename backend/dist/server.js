"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const db_1 = require("./db");
const aiEngine_1 = require("./ai/aiEngine");
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ limit: "50mb", extended: true }));
async function createSuggestion(device_id, type, reason, action, script) {
    const result = await db_1.db.query(`INSERT INTO heal_suggestions(device_id,alert_type,reason,suggested_action,script,created_at)
     VALUES($1,$2,$3,$4,$5,$6) RETURNING id`, [device_id, type, reason, action, script, Date.now()]);
    return result.rows[0].id;
}
async function ensureInventoryTable() {
    await db_1.db.query(`
    CREATE TABLE IF NOT EXISTS device_inventory (
      device_id TEXT PRIMARY KEY,
      services_summary JSONB,
      drivers_summary JSONB,
      updated_at BIGINT
    )
  `);
}
async function ensureRuntimeTables() {
    await db_1.db.query(`
    CREATE TABLE IF NOT EXISTS script_library (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      script TEXT NOT NULL
    )
  `);
    await db_1.db.query(`
    CREATE TABLE IF NOT EXISTS heal_rules (
      id SERIAL PRIMARY KEY,
      alert_type TEXT NOT NULL,
      script TEXT NOT NULL,
      auto_enabled BOOLEAN DEFAULT FALSE
    )
  `);
    await db_1.db.query(`
    CREATE TABLE IF NOT EXISTS script_jobs (
      id SERIAL PRIMARY KEY,
      device_id TEXT NOT NULL,
      script TEXT NOT NULL,
      status TEXT DEFAULT 'PENDING',
      timeout INTEGER DEFAULT 120,
      output TEXT,
      error TEXT,
      approval_status TEXT,
      approval_user TEXT,
      agent_message TEXT,
      created_at BIGINT NOT NULL,
      started_at BIGINT,
      finished_at BIGINT,
      approved_at BIGINT,
      rejected_at BIGINT
    )
  `);
    await db_1.db.query(`
    ALTER TABLE alerts
    ADD COLUMN IF NOT EXISTS suggestion_id INTEGER
  `);
    await db_1.db.query(`
    ALTER TABLE alerts
    ADD COLUMN IF NOT EXISTS auto_healed BOOLEAN DEFAULT FALSE
  `);
    await db_1.db.query(`
    ALTER TABLE heal_suggestions
    ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'PENDING'
  `);
    await db_1.db.query(`
    ALTER TABLE device_hardware
    ADD COLUMN IF NOT EXISTS health_score INTEGER
  `);
    await db_1.db.query(`
    ALTER TABLE device_hardware
    ADD COLUMN IF NOT EXISTS risk TEXT
  `);
}
function parseIssueKey(issueKey) {
    const prefix = "ALERT-";
    if (!issueKey.startsWith(prefix)) {
        return null;
    }
    const lastDash = issueKey.lastIndexOf("-");
    if (lastDash <= prefix.length) {
        return null;
    }
    const alertId = issueKey.slice(prefix.length, lastDash);
    const alertTime = issueKey.slice(lastDash + 1);
    if (!alertId || !alertTime) {
        return null;
    }
    return { alertId, alertTime };
}
/* ---------------- HELPERS ---------------- */
async function addEvent(id, type, message) {
    await db_1.db.query("INSERT INTO device_events (id,type,message,time) VALUES ($1,$2,$3,$4)", [id, type, message, Date.now()]);
}
/* ---------------- STATE TIMERS ---------------- */
const IDLE_AFTER = 60 * 1000; // 1 min
/* ---------------- POLICY CACHE ---------------- */
let POLICY = {
    cpu_threshold: 80,
    ram_threshold: 85,
    offline_seconds: 20,
};
async function loadPolicy() {
    const result = await db_1.db.query("SELECT * FROM policies LIMIT 1");
    if (result.rows[0])
        POLICY = result.rows[0];
}
loadPolicy();
ensureInventoryTable().catch((err) => console.log("INVENTORY TABLE ERROR:", err));
ensureRuntimeTables().catch((err) => console.log("RUNTIME TABLE ERROR:", err));
/* ---------------- ANOMALY ---------------- */
async function checkCpuAnomaly(id, cpu) {
    const result = await db_1.db.query(`SELECT cpu FROM metrics_history
     WHERE id=$1 ORDER BY time DESC LIMIT 20`, [id]);
    if (result.rows.length < 10)
        return;
    const avg = result.rows.reduce((a, b) => a + Number(b.cpu), 0) /
        result.rows.length;
    if (cpu > avg * 1.8) {
        const msg = `CPU anomaly (${cpu}% vs avg ${avg.toFixed(1)}%)`;
        await db_1.db.query("INSERT INTO alerts(id,message,time,acknowledged,resolved) VALUES ($1,$2,$3,false,false)", [id, msg, Date.now()]);
        await addEvent(id, "CPU_ANOMALY", msg);
    }
}
/* ---------------- METRICS INGEST ---------------- */
app.post("/metrics", async (req, res) => {
    console.log("FULL METRICS BODY:", req.body);
    const { id, cpu, ram, boot_time = null, processes = [] } = req.body;
    const now = Date.now();
    console.log("FULL METRICS BODY:", req.body);
    /* DEVICE UPSERT */
    await db_1.db.query(`INSERT INTO devices (id,cpu,ram,time,last_seen,state,boot_time)
     VALUES ($1,$2,$3,$4,$4,'ONLINE',$5)
     ON CONFLICT (id)
     DO UPDATE SET
       cpu=$2,
       ram=$3,
       time=$4,
       last_seen=$4,
       state='ONLINE',
       boot_time=$5`, [id, cpu, ram, now, boot_time]);
    if (req.body.compliance) {
        try {
            const c = req.body.compliance;
            console.log("Saving compliance for", id, c);
            await db_1.db.query(`
      INSERT INTO device_compliance
      (device_id,bitlocker,tpm,secureboot,defender,updated_at)
      VALUES($1,$2,$3,$4,$5,$6)
      ON CONFLICT(device_id)
      DO UPDATE SET
        bitlocker=$2,
        tpm=$3,
        secureboot=$4,
        defender=$5,
        updated_at=$6
    `, [
                id,
                c.bitlocker,
                c.tpm,
                c.secureBoot,
                c.defender,
                Date.now()
            ]);
        }
        catch (err) {
            console.log("COMPLIANCE INSERT ERROR:", err);
        }
    }
    if (req.body.updates) {
        const u = req.body.updates;
        await db_1.db.query(`
    INSERT INTO device_updates
    (device_id,
     windows_update_status,
     pending_updates,
     failed_updates,
     driver_status,
     outdated_drivers,
     last_checked)
    VALUES($1,$2,$3,$4,$5,$6,$7)
    ON CONFLICT(device_id)
    DO UPDATE SET
      windows_update_status=$2,
      pending_updates=$3,
      failed_updates=$4,
      driver_status=$5,
      outdated_drivers=$6,
      last_checked=$7
  `, [
            id,
            u.windows_update_status,
            u.pending_updates,
            u.failed_updates,
            u.driver_status,
            u.outdated_drivers,
            Date.now()
        ]);
    }
    if (req.body.inventory) {
        try {
            const inventory = req.body.inventory;
            await db_1.db.query(`
        INSERT INTO device_inventory
        (device_id, services_summary, drivers_summary, updated_at)
        VALUES ($1, $2::jsonb, $3::jsonb, $4)
        ON CONFLICT(device_id)
        DO UPDATE SET
          services_summary = $2::jsonb,
          drivers_summary = $3::jsonb,
          updated_at = $4
      `, [
                id,
                JSON.stringify(inventory.services || {}),
                JSON.stringify(inventory.drivers || {}),
                Date.now()
            ]);
        }
        catch (err) {
            console.log("INVENTORY SAVE ERROR:", err);
        }
    }
    if (req.body.hardware) {
        const h = req.body.hardware;
        const score = 100
            - (h.cpu_temp > 80 ? 25 : 0)
            - (h.disk > 90 ? 25 : 0)
            - (h.battery_health_percent < 20 ? 20 : 0);
        const risk = score > 80 ? "LOW" :
            score > 50 ? "MEDIUM" :
                "HIGH";
        await db_1.db.query(`
    INSERT INTO device_hardware(
      device_id,
      disk,
      disk_free,
      cpu_temp,
      battery_health,
      battery_health_percent,
      fan_status,
      health_score,
      risk,
      updated_at
    )
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)

    ON CONFLICT(device_id)
    DO UPDATE SET
      disk=$2,
      disk_free=$3,
      cpu_temp=$4,
      battery_health=$5,
      battery_health_percent=$6,
      fan_status=$7,
      health_score=$8,
      risk=$9,
      updated_at=$10
  `, [
            id,
            h.disk,
            h.disk_free,
            h.cpu_temp,
            h.battery_health,
            h.battery_health_percent,
            h.fan_status,
            score,
            risk,
            Date.now()
        ]);
    }
    const aiIssues = await (0, aiEngine_1.analyzeDeviceHealth)(req.body);
    for (const issue of aiIssues) {
        await createSuggestion(id, issue.type, issue.reason, issue.action, "AI Generated Fix");
    }
    async function attemptAutoHeal(id, alertType) {
        const rule = await db_1.db.query("SELECT * FROM heal_rules WHERE alert_type=$1 AND auto_enabled=true LIMIT 1", [alertType]);
        if (!rule.rows[0])
            return;
        await db_1.db.query(`INSERT INTO script_jobs(device_id,script,status,created_at)
     VALUES($1,$2,'PENDING',$3)`, [id, rule.rows[0].script, Date.now()]);
        await db_1.db.query("UPDATE alerts SET auto_healed=true WHERE id=$1 AND resolved=false", [id]);
    }
    /* HISTORY */
    await db_1.db.query("INSERT INTO metrics_history (id,cpu,ram,time) VALUES ($1,$2,$3,$4)", [id, cpu, ram, now]);
    /* PROCESSES */
    for (const p of processes) {
        await db_1.db.query("INSERT INTO processes (device_id,name,cpu,ram,time) VALUES ($1,$2,$3,$4,$5)", [id, p.name, p.cpu, p.ram, now]);
    }
    await checkCpuAnomaly(id, cpu);
    /* CPU ALERT */
    if (cpu > POLICY.cpu_threshold) {
        const top = processes.sort((a, b) => b.cpu - a.cpu)[0];
        const msg = `High CPU ${cpu}% (${top?.name || "unknown"})`;
        const alert = await db_1.db.query("INSERT INTO alerts(id,message,time,acknowledged,resolved) VALUES ($1,$2,$3,false,false) RETURNING time", [id, msg, now]);
        if (top) {
            const suggestionId = await createSuggestion(id, "CPU_HIGH", `${top.name} using ${top.cpu}% CPU`, `Kill process ${top.name}`, `Stop-Process -Name "${top.name}" -Force`);
            await db_1.db.query("UPDATE alerts SET suggestion_id=$1 WHERE time=$2", [suggestionId, alert.rows[0].time]);
        }
    }
    /* RAM ALERT */
    if (ram > POLICY.ram_threshold) {
        const top = processes.sort((a, b) => b.ram - a.ram)[0];
        const msg = `High RAM ${ram}%${top ? ` (${top.name})` : ""}`;
        await db_1.db.query("INSERT INTO alerts(id,message,time,acknowledged,resolved) VALUES ($1,$2,$3,false,false)", [id, msg, now]);
        await addEvent(id, "RAM_HIGH", msg);
    }
    res.send({ ok: true });
});
/* ---------------- DEVICES ---------------- */
app.get("/devices", async (_, res) => {
    const result = await db_1.db.query("SELECT * FROM devices");
    res.send(result.rows);
});
app.get("/devices/hardware", async (req, res) => {
    const idsParam = String(req.query.ids || "").trim();
    if (!idsParam) {
        return res.send({});
    }
    const ids = idsParam
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean);
    if (!ids.length) {
        return res.send({});
    }
    const result = await db_1.db.query(`SELECT *
     FROM device_hardware
     WHERE device_id = ANY($1::text[])`, [ids]);
    const hardwareByDevice = result.rows.reduce((acc, row) => {
        acc[row.device_id] = row;
        return acc;
    }, {});
    res.send(hardwareByDevice);
});
app.get("/devices/:id/compliance", async (req, res) => {
    const r = await db_1.db.query("SELECT * FROM device_compliance WHERE device_id=$1", [req.params.id]);
    res.send(r.rows[0] || {});
});
/* ---------------- POLICIES ---------------- */
app.get("/policies", async (_, res) => {
    const result = await db_1.db.query(`SELECT cpu_threshold, ram_threshold, offline_seconds
     FROM policies
     ORDER BY id ASC
     LIMIT 1`);
    res.send(result.rows[0] || POLICY);
});
app.post("/policies", async (req, res) => {
    const cpuThreshold = Number(req.body?.cpu_threshold);
    const ramThreshold = Number(req.body?.ram_threshold);
    const offlineSeconds = Number(req.body?.offline_seconds);
    if (!Number.isFinite(cpuThreshold) ||
        !Number.isFinite(ramThreshold) ||
        !Number.isFinite(offlineSeconds)) {
        return res.status(400).send({ error: "Invalid policy payload" });
    }
    const existing = await db_1.db.query("SELECT id FROM policies ORDER BY id ASC LIMIT 1");
    if (existing.rows[0]) {
        await db_1.db.query(`UPDATE policies
       SET cpu_threshold=$1,
           ram_threshold=$2,
           offline_seconds=$3
       WHERE id=$4`, [cpuThreshold, ramThreshold, offlineSeconds, existing.rows[0].id]);
    }
    else {
        await db_1.db.query(`INSERT INTO policies(cpu_threshold, ram_threshold, offline_seconds, created_at)
       VALUES($1,$2,$3,$4)`, [cpuThreshold, ramThreshold, offlineSeconds, Date.now()]);
    }
    POLICY = {
        cpu_threshold: cpuThreshold,
        ram_threshold: ramThreshold,
        offline_seconds: offlineSeconds,
    };
    res.send({ ok: true, policy: POLICY });
});
app.get("/devices/:id/hardware", async (req, res) => {
    const r = await db_1.db.query("SELECT * FROM device_hardware WHERE device_id=$1", [req.params.id]);
    res.send(r.rows[0] || {});
});
app.get("/devices/:id/updates", async (req, res) => {
    const r = await db_1.db.query("SELECT * FROM device_updates WHERE device_id=$1", [req.params.id]);
    res.send(r.rows[0] || {});
});
app.get("/devices/:id/inventory", async (req, res) => {
    const r = await db_1.db.query("SELECT * FROM device_inventory WHERE device_id=$1", [req.params.id]);
    res.send(r.rows[0] || {});
});
/* ---------------- HISTORY ---------------- */
app.get("/devices/:id/history", async (req, res) => {
    const range = req.query.range || "1h";
    let duration = 3600;
    if (range === "1d")
        duration = 86400;
    if (range === "1w")
        duration = 604800;
    const since = Date.now() - duration * 1000;
    const result = await db_1.db.query(`SELECT * FROM metrics_history
     WHERE id=$1 AND time > $2
     ORDER BY time ASC`, [req.params.id, since]);
    res.send(result.rows);
});
/* ---------------- EVENTS (TIMELINE) ---------------- */
app.get("/devices/:id/events", async (req, res) => {
    const result = await db_1.db.query(`SELECT * FROM device_events
     WHERE id=$1
     ORDER BY time DESC
     LIMIT 100`, [req.params.id]);
    res.send(result.rows.map(r => ({
        ...r,
        time: Number(r.time)
    })));
});
app.get("/devices/:id", async (req, res) => {
    const result = await db_1.db.query("SELECT * FROM devices WHERE id=$1", [req.params.id]);
    res.send(result.rows[0] || {});
});
app.get("/test-route", (_, res) => {
    res.send("Working");
});
/* ---------------- HEAL SUGGESTIONS ---------------- */
app.get("/heal/suggestions", async (_, res) => {
    const r = await db_1.db.query(`SELECT *,
      to_timestamp(created_at/1000) as created_readable
     FROM heal_suggestions
     WHERE status='PENDING'
     ORDER BY created_at DESC`);
    res.send(r.rows);
});
app.post("/heal/approve/:id", async (req, res) => {
    const s = await db_1.db.query("SELECT * FROM heal_suggestions WHERE id=$1", [req.params.id]);
    if (!s.rows[0])
        return res.sendStatus(404);
    const sug = s.rows[0];
    await db_1.db.query("UPDATE heal_suggestions SET status='APPROVED' WHERE id=$1", [sug.id]);
    await db_1.db.query(`INSERT INTO script_jobs(device_id,script,status,created_at)
     VALUES($1,$2,'PENDING',$3)`, [sug.device_id, sug.script, Date.now()]);
    res.send({ ok: true });
});
app.post("/heal/reject/:id", async (req, res) => {
    await db_1.db.query("UPDATE heal_suggestions SET status='REJECTED' WHERE id=$1", [req.params.id]);
    res.send({ ok: true });
});
/* ================= SCRIPT LIBRARY ================= */
app.get("/scripts/library", async (_, res) => {
    const r = await db_1.db.query(`
    SELECT id,name,description
    FROM script_library
    ORDER BY id ASC
  `);
    res.send(r.rows);
});
/* Script execution from library */
app.post("/scripts/run-library", async (req, res) => {
    const { device, script_id } = req.body;
    if (!device || !script_id)
        return res.status(400).send({ error: "device & script_id required" });
    const script = await db_1.db.query("SELECT script FROM script_library WHERE id=$1", [script_id]);
    if (!script.rows.length)
        return res.status(404).send({ error: "Script not found" });
    await db_1.db.query(`INSERT INTO script_jobs(device_id,script,status,created_at)
     VALUES ($1,$2,'PENDING',$3)`, [device, script.rows[0].script, Date.now()]);
    res.send({ ok: true });
});
/* ---------------- ALERTS ---------------- */
app.get("/alerts", async (req, res) => {
    const since = Number(req.query.since);
    if (!since || isNaN(since)) {
        const result = await db_1.db.query("SELECT * FROM alerts ORDER BY time DESC LIMIT 100");
        return res.send(result.rows);
    }
    const result = await db_1.db.query("SELECT * FROM alerts WHERE time > $1 ORDER BY time DESC", [since]);
    res.send(result.rows);
});
app.post("/alerts/:time/ack", async (req, res) => {
    await db_1.db.query("UPDATE alerts SET acknowledged=true WHERE time=$1", [req.params.time]);
    res.send({ ok: true });
});
/* ---------------- TOP PROCESSES ---------------- */
app.get("/devices/:id/top-processes", async (req, res) => {
    const since = Date.now() - 600000;
    const result = await db_1.db.query(`SELECT name,
            ROUND(AVG(cpu)::numeric,2) as cpu,
            ROUND(AVG(ram)::numeric,2) as ram
     FROM processes
     WHERE device_id=$1 AND time > $2
     GROUP BY name
     ORDER BY cpu DESC
     LIMIT 5`, [req.params.id, since]);
    res.send(result.rows);
});
/* ---------------- SMART PRESENCE ---------------- */
setInterval(async () => {
    const now = Date.now();
    const lostAfter = Math.max(1000, Number(POLICY.offline_seconds || 20) * 1000);
    const idleAfter = Math.min(IDLE_AFTER, lostAfter);
    const result = await db_1.db.query("SELECT * FROM devices");
    for (const d of result.rows) {
        const diff = now - Number(d.last_seen);
        if (diff < idleAfter) {
            await db_1.db.query("UPDATE devices SET state='ONLINE' WHERE id=$1", [d.id]);
            continue;
        }
        if (diff < lostAfter) {
            await db_1.db.query("UPDATE devices SET state='IDLE' WHERE id=$1", [d.id]);
            continue;
        }
        await db_1.db.query("UPDATE devices SET state='LOST' WHERE id=$1", [d.id]);
        const exist = await db_1.db.query("SELECT 1 FROM alerts WHERE id=$1 AND message='Device not reporting' AND resolved=false", [d.id]);
        if (exist.rowCount === 0) {
            await db_1.db.query("INSERT INTO alerts(id,message,time,acknowledged,resolved) VALUES ($1,'Device not reporting',$2,false,false)", [d.id, now]);
            await addEvent(d.id, "OFFLINE", "Device stopped reporting");
        }
    }
}, 30000);
/* =========================================================
   SCRIPT EXECUTION ENGINE (CLEAN VERSION)
   ========================================================= */
/* Create Job */
app.post("/scripts/run", async (req, res) => {
    if (!req.body || !req.body.device_id || !req.body.script)
        return res.status(400).send({ error: "device_id & script required" });
    const { device_id, script } = req.body;
    const r = await db_1.db.query(`INSERT INTO script_jobs(device_id,script,status,created_at)
     VALUES($1,$2,'PENDING',$3)
     RETURNING id`, [device_id.trim(), script, Date.now()]);
    console.log("JOB CREATED:", r.rows[0].id, "for", device_id);
    res.send({ job_id: r.rows[0].id });
});
/* Agent Pull Job */
app.get("/agent/job/:deviceId", async (req, res) => {
    const r = await db_1.db.query(`SELECT id, script, timeout
     FROM script_jobs
     WHERE device_id=$1 AND status='PENDING'
     ORDER BY id ASC
     LIMIT 1`, [req.params.deviceId]);
    if (r.rows.length === 0)
        return res.send({});
    const job = r.rows[0];
    await db_1.db.query("UPDATE script_jobs SET status='RUNNING', started_at=$1 WHERE id=$2", [Date.now(), job.id]);
    res.send({
        job_id: job.id,
        script: job.script,
        timeout: job.timeout || 120
    });
});
/* LIVE LOG STREAM */
app.post("/agent/job/log", async (req, res) => {
    const { job_id, chunk } = req.body;
    if (!job_id || chunk === undefined)
        return res.status(400).send({ error: "invalid log payload" });
    await db_1.db.query(`UPDATE script_jobs
     SET output = COALESCE(output,'') || $1
     WHERE id=$2`, [chunk, job_id]);
    res.send({ ok: true });
});
/* Agent Send Result */
app.post("/agent/job/result", async (req, res) => {
    let { job_id, success, output, error } = req.body;
    success = success === true || success === "true";
    console.log("JOB RESULT:", job_id, success);
    const finishedTime = Date.now();
    await db_1.db.query(`UPDATE script_jobs
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
});
/* UI History */
app.get("/scripts/jobs", async (_, res) => {
    const r = await db_1.db.query(`SELECT id,device_id,status,output,error,created_at,started_at,finished_at
     FROM script_jobs
     ORDER BY id DESC
     LIMIT 50`);
    res.send(r.rows);
});
/* -------- APPROVAL HISTORY -------- */
/* ---------------- APPROVAL TIMELINE ---------------- */
/* ---------------- APPROVAL TIMELINE ---------------- */
app.get("/scripts/approvals", async (_, res) => {
    const result = await db_1.db.query(`
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
});
app.post("/agent/job/approval", async (req, res) => {
    const { job_id, status, user, message = "", time } = req.body;
    console.log("APPROVAL RECEIVED:", job_id, status);
    if (!job_id || !status)
        return res.status(400).send({ error: "Invalid approval payload" });
    if (status === "APPROVED") {
        await db_1.db.query(`UPDATE script_jobs
       SET approval_status='APPROVED',
           approved_at=$2,
           approval_user=$3
       WHERE id=$1`, [job_id, time, user]);
    }
    else if (status === "REJECTED") {
        await db_1.db.query(`UPDATE script_jobs
       SET approval_status='REJECTED',
           rejected_at=$2,
           approval_user=$3,
           agent_message=$4,
           status='FAILED',
           finished_at=$2
       WHERE id=$1`, [job_id, time, user, message]);
    }
    res.send({ ok: true });
});
app.get("/heal/timeline", async (_, res) => {
    const result = await db_1.db.query(`
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
});
/* ---------------- ISSUES (transform alerts to issues format) ---------------- */
app.get("/issues", async (req, res) => {
    console.log("GET /issues called");
    try {
        const result = await db_1.db.query(`SELECT * FROM alerts ORDER BY time DESC LIMIT 100`);
        console.log("Found", result.rows.length, "alerts");
        const issues = result.rows.map((alert) => {
            let type = "other";
            let severity = "medium";
            if (alert.message.toLowerCase().includes("cpu")) {
                type = "performance";
                severity = alert.message.includes("anomaly") ? "high" : "medium";
            }
            else if (alert.message.toLowerCase().includes("ram")) {
                type = "performance";
                severity = "medium";
            }
            else if (alert.message.toLowerCase().includes("security")) {
                type = "security";
                severity = "critical";
            }
            else if (alert.message.toLowerCase().includes("update")) {
                type = "update";
                severity = "low";
            }
            else if (alert.message.toLowerCase().includes("service")) {
                type = "service";
                severity = "high";
            }
            else if (alert.message.toLowerCase().includes("driver")) {
                type = "driver";
                severity = "medium";
            }
            let status = "open";
            if (alert.resolved) {
                status = "resolved";
            }
            else if (alert.acknowledged) {
                status = "in-progress";
            }
            else if (alert.auto_healed) {
                status = "pending";
            }
            return {
                id: `ALERT-${alert.id}-${alert.time}`,
                title: alert.message,
                description: alert.message,
                type,
                severity,
                status,
                device_id: alert.id,
                created_at: alert.time,
                updated_at: alert.time,
                action_required: !alert.resolved && !alert.acknowledged,
                auto_remediation_available: !!alert.suggestion_id || alert.auto_healed
            };
        });
        console.log("Sending", issues.length, "issues");
        res.send(issues);
    }
    catch (err) {
        console.error("ISSUES FETCH ERROR:", err);
        res.status(500).send({ error: "Failed to fetch issues" });
    }
});
app.post("/issues/:id/resolve", async (req, res) => {
    try {
        const parsed = parseIssueKey(req.params.id);
        if (!parsed) {
            return res.status(400).send({ error: "Invalid issue id" });
        }
        await db_1.db.query("UPDATE alerts SET resolved=true WHERE id=$1 AND time=$2", [parsed.alertId, parsed.alertTime]);
        res.send({ ok: true });
    }
    catch (err) {
        console.error("RESOLVE ERROR:", err);
        res.status(500).send({ error: "Failed to resolve issue" });
    }
});
app.post("/issues/:id/escalate", async (req, res) => {
    try {
        const parsed = parseIssueKey(req.params.id);
        if (!parsed) {
            return res.status(400).send({ error: "Invalid issue id" });
        }
        await db_1.db.query("UPDATE alerts SET acknowledged=true WHERE id=$1 AND time=$2", [parsed.alertId, parsed.alertTime]);
        res.send({ ok: true });
    }
    catch (err) {
        console.error("ESCALATE ERROR:", err);
        res.status(500).send({ error: "Failed to escalate issue" });
    }
});
app.post("/issues/:id/remediate", async (req, res) => {
    try {
        const parsed = parseIssueKey(req.params.id);
        if (!parsed) {
            return res.status(400).send({ error: "Invalid issue id" });
        }
        // Trigger auto-healing
        await db_1.db.query("UPDATE alerts SET auto_healed=true WHERE id=$1 AND time=$2", [parsed.alertId, parsed.alertTime]);
        res.send({ ok: true });
    }
    catch (err) {
        console.error("REMEDIATE ERROR:", err);
        res.status(500).send({ error: "Failed to remediate issue" });
    }
});
/* ---------------- START ---------------- */
app.listen(4000, () => console.log("Collector running on http://localhost:4000"));
