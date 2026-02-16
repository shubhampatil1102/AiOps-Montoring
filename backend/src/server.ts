import express from "express";
import cors from "cors";
import { db } from "./db";

const app = express();
app.use(cors());
app.use(express.json());

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
  const { id, cpu, ram, boot_time = null, processes = [] } = req.body;
  const now = Date.now();

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
    const msg = `High CPU ${cpu}%${top ? ` (${top.name})` : ""}`;

    await db.query(
      "INSERT INTO alerts(id,message,time,acknowledged,resolved) VALUES ($1,$2,$3,false,false)",
      [id, msg, now]
    );
    await addEvent(id, "CPU_HIGH", msg);
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

app.get("/devices/:id", async (req, res) => {
  const result = await db.query(
    "SELECT * FROM devices WHERE id=$1",
    [req.params.id]
  );
  res.send(result.rows[0] || {});
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

/* ---------------- Scripts run through agent ---------------- */

app.post("/scripts", async (req,res)=>{
  const {name,description,script,timeout=120} = req.body;

  await db.query(
    "INSERT INTO scripts(name,description,script,timeout,created_at) VALUES($1,$2,$3,$4,$5)",
    [name,description,script,timeout,Date.now()]
  );

  res.send({ok:true});
});

/* ---------------- Get Script ---------------- */
app.get("/scripts", async (req,res)=>{
  const r = await db.query("SELECT id,name,description,timeout FROM scripts ORDER BY id DESC");
  res.send(r.rows);
});

/* ---------------- Run Script on Device ---------------- */
app.post("/scripts/run", async (req,res)=>{
  const {device_id,script_id} = req.body;

  await db.query(
    "INSERT INTO script_jobs(device_id,script_id,status) VALUES($1,$2,'PENDING')",
    [device_id,script_id]
  );

  res.send({ok:true});
});
/* ---------------- Agent asks for Job ---------------- */
app.get("/agent/job/:deviceId", async (req,res)=>{

  const r = await db.query(`
    SELECT j.id,s.script,s.timeout
    FROM script_jobs j
    JOIN scripts s ON s.id=j.script_id
    WHERE j.device_id=$1 AND j.status='PENDING'
    ORDER BY j.id ASC
    LIMIT 1
  `,[req.params.deviceId]);

  if(r.rows.length===0) return res.send({job:null});

  const job = r.rows[0];

  await db.query(
    "UPDATE script_jobs SET status='RUNNING',started_at=$1 WHERE id=$2",
    [Date.now(),job.id]
  );

  res.send({
    job_id:job.id,
    script:job.script,
    timeout:job.timeout
  });
});

/* ---------------- Agent sends job report-------- */
app.post("/agent/job/result", async (req,res)=>{
  const {job_id,success,output,error} = req.body;

  await db.query(
    `UPDATE script_jobs
     SET status=$1,
         output=$2,
         error=$3,
         finished_at=$4
     WHERE id=$5`,
    [success?"SUCCESS":"FAILED",output,error,Date.now(),job_id]
  );

  res.send({ok:true});
});

/* ---------------- UI Job history ---------------- */
app.get("/scripts/jobs", async (req,res)=>{
  const r = await db.query(`
    SELECT j.*,s.name
    FROM script_jobs j
    JOIN scripts s ON s.id=j.script_id
    ORDER BY j.id DESC
    LIMIT 100
  `);

  res.send(r.rows);
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

/* ---------------- START ---------------- */
app.listen(4000, () =>
  console.log("Collector running on http://localhost:4000")
);
