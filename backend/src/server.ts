import express from "express";
import cors from "cors";
import { db } from "./db";
import { styleText } from "node:util";
import { analyzeDeviceHealth } from "./ai/aiEngine";

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ limit: "50mb", extended: true }));

async function createSuggestion(device_id: string, type: string, reason: string, action: string, script: string) {

  const result = await db.query(
    `INSERT INTO heal_suggestions(device_id,alert_type,reason,suggested_action,script,created_at)
     VALUES($1,$2,$3,$4,$5,$6) RETURNING id`,
    [device_id, type, reason, action, script, Date.now()]
  );

  return result.rows[0].id;
}

/* ---------------- HELPERS ---------------- */
async function addEvent(id: string, type: string, message: string) {
  await db.query(
    "INSERT INTO device_events (id,type,message,time) VALUES ($1,$2,$3,$4)",
    [id, type, message, Date.now()]
  );
}

/* ---------------- STATE TIMERS ---------------- */
const IDLE_AFTER = 60 * 1000;       // 1 min
const LOST_AFTER = 5 * 60 * 1000;   // 5 min

/* ---------------- POLICY CACHE ---------------- */
let POLICY = {
  cpu_threshold: 80,
  ram_threshold: 85,
  offline_seconds: 20,
};

async function loadPolicy() {
  const result = await db.query("SELECT * FROM policies LIMIT 1");
  if (result.rows[0]) POLICY = result.rows[0];
}
loadPolicy();

/* ---------------- ANOMALY ---------------- */
async function checkCpuAnomaly(id: string, cpu: number) {
  const result = await db.query(
    `SELECT cpu FROM metrics_history
     WHERE id=$1 ORDER BY time DESC LIMIT 20`,
    [id]
  );

  if (result.rows.length < 10) return;

  const avg =
    result.rows.reduce((a, b) => a + Number(b.cpu), 0) /
    result.rows.length;

  if (cpu > avg * 1.8) {
    const msg = `CPU anomaly (${cpu}% vs avg ${avg.toFixed(1)}%)`;
    await db.query(
      "INSERT INTO alerts(id,message,time,acknowledged,resolved) VALUES ($1,$2,$3,false,false)",
      [id, msg, Date.now()]
    );
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
  await db.query(
    `INSERT INTO devices (id,cpu,ram,time,last_seen,state,boot_time)
     VALUES ($1,$2,$3,$4,$4,'ONLINE',$5)
     ON CONFLICT (id)
     DO UPDATE SET
       cpu=$2,
       ram=$3,
       time=$4,
       last_seen=$4,
       state='ONLINE',
       boot_time=$5`,
    [id, cpu, ram, now, boot_time]
  );

  if (req.body.compliance) {
    try {
      const c = req.body.compliance;

      console.log("Saving compliance for", id, c);

      await db.query(`
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
    `,
        [
          id,
          c.bitlocker,
          c.tpm,
          c.secureBoot,
          c.defender,
          Date.now()
        ]);

    } catch (err) {
      console.log("COMPLIANCE INSERT ERROR:", err);
    }
  }

  if (req.body.hardware) {

    const h = req.body.hardware;

    const score =
      100
      - (h.cpu_temp > 80 ? 25 : 0)
      - (h.disk > 90 ? 25 : 0)
      - (h.battery < 20 ? 20 : 0);

    const risk =
      score > 80 ? "LOW" :
        score > 50 ? "MEDIUM" :
          "HIGH";

    await db.query(`
    INSERT INTO device_hardware(
      device_id,
      cpu_usage,
      ram_usage,
      disk,
      disk_free,
      cpu_temp,
      battery,
      fan_status,
      health_score,
      risk,
      updated_at
    )
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)

    ON CONFLICT(device_id)
    DO UPDATE SET
      cpu_usage=$2,
      ram_usage=$3,
      disk=$4,
      disk_free=$5,
      cpu_temp=$6,
      battery=$7,
      fan_status=$8,
      health_score=$9,
      risk=$10,
      updated_at=$11
  `,
      [
        id,
        cpu,
        ram,
        h.disk,
        h.disk_free,
        h.cpu_temp,
        h.battery,
        h.fan_status,
        score,
        risk,
        Date.now()
      ]);
  }
  const aiIssues = await analyzeDeviceHealth(req.body);

  for (const issue of aiIssues) {

    await createSuggestion(
      id,
      issue.type,
      issue.reason,
      issue.action,
      "AI Generated Fix"
    );
  }

  /* ================= HARDWARE SAVE ================= */

if (req.body.hardware) {
  try {

    const h = req.body.hardware;

    console.log("Saving hardware:", id, h);

    await db.query(`
      INSERT INTO device_hardware
      (device_id,disk,disk_free,cpu_temp,
       battery_health,battery_health_percent,
       fan_status,updated_at)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8)
      ON CONFLICT(device_id)
      DO UPDATE SET
        disk=$2,
        disk_free=$3,
        cpu_temp=$4,
        battery_health=$5,
        battery_health_percent=$6,
        fan_status=$7,
        updated_at=$8
    `,
    [
      id,
      h.disk,
      h.disk_free,
      h.cpu_temp,
      h.battery_health,
      h.battery_health_percent,
      h.fan_status,
      Date.now()
    ]);

  } catch(err){
    console.log("HARDWARE SAVE ERROR:", err);
  }
}
  async function attemptAutoHeal(id: string, alertType: string) {

    const rule = await db.query(
      "SELECT * FROM heal_rules WHERE alert_type=$1 AND auto_enabled=true LIMIT 1",
      [alertType]
    );

    if (!rule.rows[0]) return;

    await db.query(
      `INSERT INTO script_jobs(device_id,script,status,created_at)
     VALUES($1,$2,'PENDING',$3)`,
      [id, rule.rows[0].script, Date.now()]
    );

    await db.query(
      "UPDATE alerts SET auto_healed=true WHERE id=$1 AND resolved=false",
      [id]
    );
  }


  /* HISTORY */
  await db.query(
    "INSERT INTO metrics_history (id,cpu,ram,time) VALUES ($1,$2,$3,$4)",
    [id, cpu, ram, now]
  );

  /* PROCESSES */
  for (const p of processes) {
    await db.query(
      "INSERT INTO processes (device_id,name,cpu,ram,time) VALUES ($1,$2,$3,$4,$5)",
      [id, p.name, p.cpu, p.ram, now]
    );
  }

  await checkCpuAnomaly(id, cpu);

  /* CPU ALERT */
  if (cpu > POLICY.cpu_threshold) {

    const top = processes.sort((a: any, b: any) => b.cpu - a.cpu)[0];
    const msg = `High CPU ${cpu}% (${top?.name || "unknown"})`;

    const alert = await db.query(
      "INSERT INTO alerts(id,message,time,acknowledged,resolved) VALUES ($1,$2,$3,false,false) RETURNING time",
      [id, msg, now]
    );

    if (top) {
      const suggestionId = await createSuggestion(
        id,
        "CPU_HIGH",
        `${top.name} using ${top.cpu}% CPU`,
        `Kill process ${top.name}`,
        `Stop-Process -Name "${top.name}" -Force`
      );

      await db.query(
        "UPDATE alerts SET suggestion_id=$1 WHERE time=$2",
        [suggestionId, alert.rows[0].time]
      );
    }
  }


  /* RAM ALERT */
  if (ram > POLICY.ram_threshold) {
    const top = processes.sort((a: any, b: any) => b.ram - a.ram)[0];
    const msg = `High RAM ${ram}%${top ? ` (${top.name})` : ""}`;

    await db.query(
      "INSERT INTO alerts(id,message,time,acknowledged,resolved) VALUES ($1,$2,$3,false,false)",
      [id, msg, now]
    );
    await addEvent(id, "RAM_HIGH", msg);
  }

  res.send({ ok: true });
});

/* ---------------- DEVICES ---------------- */
app.get("/devices", async (_, res) => {
  const result = await db.query("SELECT * FROM devices");
  res.send(result.rows);
});
app.get("/devices/:id/compliance", async (req, res) => {
  const r = await db.query(
    "SELECT * FROM device_compliance WHERE device_id=$1",
    [req.params.id]
  );
  res.send(r.rows[0] || {});
});

app.get("/devices/:id/hardware", async (req,res)=>{

  const r = await db.query(
    "SELECT * FROM device_hardware WHERE device_id=$1",
    [req.params.id]
  );

  res.send(r.rows[0] || {});
});
/* ---------------- HISTORY ---------------- */
app.get("/devices/:id/history", async (req, res) => {
  const range = req.query.range || "1h";
  let duration = 3600;
  if (range === "1d") duration = 86400;
  if (range === "1w") duration = 604800;

  const since = Date.now() - duration * 1000;

  const result = await db.query(
    `SELECT * FROM metrics_history
     WHERE id=$1 AND time > $2
     ORDER BY time ASC`,
    [req.params.id, since]
  );

  res.send(result.rows);
});



/* ---------------- EVENTS (TIMELINE) ---------------- */
app.get("/devices/:id/events", async (req, res) => {
  const result = await db.query(
    `SELECT * FROM device_events
     WHERE id=$1
     ORDER BY time DESC
     LIMIT 100`,
    [req.params.id]
  );
  res.send(result.rows.map(r => ({
    ...r,
    time: Number(r.time)
  })));
});
app.get("/devices/:id", async (req, res) => {
  const result = await db.query(
    "SELECT * FROM devices WHERE id=$1",
    [req.params.id]
  );
  res.send(result.rows[0] || {});
});

app.get("/test-route", (_, res) => {
  res.send("Working");
});



/* ---------------- HEAL SUGGESTIONS ---------------- */
app.get("/heal/suggestions", async (_, res) => {

  const r = await db.query(
    `SELECT *,
      to_timestamp(created_at/1000) as created_readable
     FROM heal_suggestions
     WHERE status='PENDING'
     ORDER BY created_at DESC`
  );

  res.send(r.rows);
});


app.post("/heal/approve/:id", async (req, res) => {

  const s = await db.query(
    "SELECT * FROM heal_suggestions WHERE id=$1",
    [req.params.id]
  );

  if (!s.rows[0]) return res.sendStatus(404);
  const sug = s.rows[0];

  await db.query(
    "UPDATE heal_suggestions SET status='APPROVED' WHERE id=$1",
    [sug.id]
  );

  await db.query(
    `INSERT INTO script_jobs(device_id,script,status,created_at)
     VALUES($1,$2,'PENDING',$3)`,
    [sug.device_id, sug.script, Date.now()]
  );

  res.send({ ok: true });
});


app.post("/heal/reject/:id", async (req, res) => {
  await db.query(
    "UPDATE heal_suggestions SET status='REJECTED' WHERE id=$1",
    [req.params.id]
  );
  res.send({ ok: true });
});


/* ================= SCRIPT LIBRARY ================= */

app.get("/scripts/library", async (_, res) => {
  const r = await db.query(`
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

  const script = await db.query(
    "SELECT script FROM script_library WHERE id=$1",
    [script_id]
  );

  if (!script.rows.length)
    return res.status(404).send({ error: "Script not found" });

  await db.query(
    `INSERT INTO script_jobs(device_id,script,status,created_at)
     VALUES ($1,$2,'PENDING',$3)`,
    [device, script.rows[0].script, Date.now()]
  );

  res.send({ ok: true });
});



/* ---------------- ALERTS ---------------- */
app.get("/alerts", async (req, res) => {
  const since = Number(req.query.since);

  if (!since || isNaN(since)) {
    const result = await db.query(
      "SELECT * FROM alerts ORDER BY time DESC LIMIT 100"
    );
    return res.send(result.rows);
  }

  const result = await db.query(
    "SELECT * FROM alerts WHERE time > $1 ORDER BY time DESC",
    [since]
  );
  res.send(result.rows);
});

app.post("/alerts/:time/ack", async (req, res) => {
  await db.query(
    "UPDATE alerts SET acknowledged=true WHERE time=$1",
    [req.params.time]
  );
  res.send({ ok: true });
});

/* ---------------- TOP PROCESSES ---------------- */
app.get("/devices/:id/top-processes", async (req, res) => {
  const since = Date.now() - 600000;

  const result = await db.query(
    `SELECT name,
            ROUND(AVG(cpu)::numeric,2) as cpu,
            ROUND(AVG(ram)::numeric,2) as ram
     FROM processes
     WHERE device_id=$1 AND time > $2
     GROUP BY name
     ORDER BY cpu DESC
     LIMIT 5`,
    [req.params.id, since]
  );

  res.send(result.rows);
});

/* ---------------- SMART PRESENCE ---------------- */
setInterval(async () => {
  const now = Date.now();
  const result = await db.query("SELECT * FROM devices");

  for (const d of result.rows) {
    const diff = now - Number(d.last_seen);

    if (diff < IDLE_AFTER) {
      await db.query("UPDATE devices SET state='ONLINE' WHERE id=$1", [d.id]);
      continue;
    }

    if (diff < LOST_AFTER) {
      await db.query("UPDATE devices SET state='IDLE' WHERE id=$1", [d.id]);
      continue;
    }

    await db.query("UPDATE devices SET state='LOST' WHERE id=$1", [d.id]);

    const exist = await db.query(
      "SELECT 1 FROM alerts WHERE id=$1 AND message='Device not reporting' AND resolved=false",
      [d.id]
    );

    if (exist.rowCount === 0) {
      await db.query(
        "INSERT INTO alerts(id,message,time,acknowledged,resolved) VALUES ($1,'Device not reporting',$2,false,false)",
        [d.id, now]
      );
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

  const r = await db.query(
    `INSERT INTO script_jobs(device_id,script,status,created_at)
     VALUES($1,$2,'PENDING',$3)
     RETURNING id`,
    [device_id.trim(), script, Date.now()]
  );

  console.log("JOB CREATED:", r.rows[0].id, "for", device_id);

  res.send({ job_id: r.rows[0].id });
});


/* Agent Pull Job */
app.get("/agent/job/:deviceId", async (req, res) => {

  const r = await db.query(
    `SELECT id, script, timeout
     FROM script_jobs
     WHERE device_id=$1 AND status='PENDING'
     ORDER BY id ASC
     LIMIT 1`,
    [req.params.deviceId]
  );

  if (r.rows.length === 0)
    return res.send({});

  const job = r.rows[0];

  await db.query(
    "UPDATE script_jobs SET status='RUNNING', started_at=$1 WHERE id=$2",
    [Date.now(), job.id]
  );

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

  await db.query(
    `UPDATE script_jobs
     SET output = COALESCE(output,'') || $1
     WHERE id=$2`,
    [chunk, job_id]
  );

  res.send({ ok: true });
});


/* Agent Send Result */
app.post("/agent/job/result", async (req, res) => {

  let { job_id, success, output, error } = req.body;

  success = success === true || success === "true";

  console.log("JOB RESULT:", job_id, success);

  const finishedTime = Date.now();

  await db.query(
    `UPDATE script_jobs
     SET status=$1,
         output=$2,
         error=$3,
         finished_at=$4
     WHERE id=$5`,
    [
      success ? "SUCCESS" : "FAILED",
      output ?? "",
      error ?? "",
      finishedTime,
      job_id
    ]
  );

  res.send({ ok: true });
});


/* UI History */
app.get("/scripts/jobs", async (_, res) => {

  const r = await db.query(
    `SELECT id,device_id,status,output,error,created_at,started_at,finished_at
     FROM script_jobs
     ORDER BY id DESC
     LIMIT 50`
  );

  res.send(r.rows);
});

/* -------- APPROVAL HISTORY -------- */
/* ---------------- APPROVAL TIMELINE ---------------- */

/* ---------------- APPROVAL TIMELINE ---------------- */

app.get("/scripts/approvals", async (_, res) => {

  const result = await db.query(`
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

    await db.query(
      `UPDATE script_jobs
       SET approval_status='APPROVED',
           approved_at=$2,
           approval_user=$3
       WHERE id=$1`,
      [job_id, time, user]
    );

  }
  else if (status === "REJECTED") {

    await db.query(
      `UPDATE script_jobs
       SET approval_status='REJECTED',
           rejected_at=$2,
           approval_user=$3,
           agent_message=$4,
           status='FAILED',
           finished_at=$2
       WHERE id=$1`,
      [job_id, time, user, message]
    );
  }

  res.send({ ok: true });
});


app.get("/heal/timeline", async (_, res) => {

  const result = await db.query(`
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


/* ---------------- START ---------------- */
app.listen(4000, () =>
  console.log("Collector running on http://localhost:4000")
);
