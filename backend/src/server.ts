import express from "express";
import cors from "cors";
import { db } from "./db";

const app = express();
app.use(cors());
app.use(express.json());

/* ---------------- STATE TIMERS ---------------- */
const IDLE_AFTER = 60 * 1000;      // 1 min
const LOST_AFTER = 5 * 60 * 1000;  // 5 min

/* ---------------- POLICY CACHE ---------------- */
let POLICY = {
  cpu_threshold: 80,
  ram_threshold: 85,
  offline_seconds: 20,
};

async function loadPolicy() {
  const result = await db.query("SELECT * FROM policies LIMIT 1");
  if (result.rows[0]) {
    POLICY = result.rows[0];
    console.log("Policy loaded:", POLICY);
  }
}
loadPolicy();

/* ---------------- ANOMALY ---------------- */
async function checkCpuAnomaly(id: string, cpu: number) {
  const result = await db.query(
    `SELECT cpu FROM metrics_history
     WHERE id=$1
     ORDER BY time DESC
     LIMIT 20`,
    [id]
  );

  if (result.rows.length < 10) return;

  const avg =
    result.rows.reduce((a, b) => a + Number(b.cpu), 0) /
    result.rows.length;

  if (cpu > avg * 1.8) {
    await db.query(
      "INSERT INTO alerts(id,message,time,acknowledged,resolved) VALUES ($1,$2,$3,false,false)",
      [id, `CPU anomaly detected (${cpu}% vs avg ${avg.toFixed(1)}%)`, Date.now()]
    );
  }
}

/* ---------------- METRICS INGEST ---------------- */
app.post("/metrics", async (req, res) => {
  const { id, cpu, ram, processes = [] } = req.body;
  const now = Date.now();

  // upsert device
  await db.query(
    `INSERT INTO devices (id,cpu,ram,time,last_seen,state)
     VALUES ($1,$2,$3,$4,$4,'ONLINE')
     ON CONFLICT (id)
     DO UPDATE SET
       cpu=$2,
       ram=$3,
       time=$4,
       last_seen=$4,
       state='ONLINE'`,
    [id, cpu, ram, now]
  );

  // history
  await db.query(
    "INSERT INTO metrics_history VALUES ($1,$2,$3,$4)",
    [id, cpu, ram, now]
  );

  // store processes
  for (const p of processes) {
    await db.query(
      "INSERT INTO processes VALUES ($1,$2,$3,$4,$5)",
      [id, p.name, p.cpu, p.ram, now]
    );
  }

  await checkCpuAnomaly(id, cpu);

  /* CPU ALERT */
  if (cpu > POLICY.cpu_threshold) {
    let cause = "";
    if (processes.length > 0) {
      const top = processes.sort((a:any,b:any)=>b.cpu-a.cpu)[0];
      cause = ` (caused by ${top.name} ${top.cpu}%)`;
    }

    await db.query(
      "INSERT INTO alerts(id,message,time,acknowledged,resolved) VALUES ($1,$2,$3,false,false)",
      [id, `High CPU usage: ${cpu}%${cause}`, now]
    );
  }

  /* RAM ALERT */
  if (ram > POLICY.ram_threshold) {
    let cause = "";
    if (processes.length > 0) {
      const top = processes.sort((a:any,b:any)=>b.ram-a.ram)[0];
      cause = ` (top process ${top.name} ${top.ram}MB)`;
    }

    await db.query(
      "INSERT INTO alerts(id,message,time,acknowledged,resolved) VALUES ($1,$2,$3,false,false)",
      [id, `High RAM usage: ${ram}%${cause}`, now]
    );
  }

  res.send({ ok: true });
});

/* ---------------- AGENT PRESENCE ---------------- */
app.post("/device/offline", async (req,res)=>{
  await db.query(
    "UPDATE devices SET state='EXPECTED_OFFLINE' WHERE id=$1",
    [req.body.id]
  );
  res.send({ok:true});
});

app.post("/device/online", async (req,res)=>{
  await db.query(
    "UPDATE devices SET state='ONLINE', last_seen=$2 WHERE id=$1",
    [req.body.id, Date.now()]
  );
  res.send({ok:true});
});

/* ---------------- DEVICES ---------------- */
app.get("/devices", async (_, res) => {
  const result = await db.query("SELECT * FROM devices");
  res.send(result.rows);
});

app.get("/devices/:id", async (req, res) => {
  const result = await db.query("SELECT * FROM devices WHERE id=$1", [req.params.id]);
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

/* ---------------- ALERTS ---------------- */
app.get("/alerts", async (_, res) => {
  const result = await db.query(`
    SELECT *
    FROM alerts
    ORDER BY time DESC
    LIMIT 100
  `);
  res.send(result.rows);
});

app.post("/alerts/:time/ack", async (req, res) => {
  await db.query("UPDATE alerts SET acknowledged=true WHERE time=$1", [req.params.time]);
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

/* ---------------- SMART PRESENCE CHECKER ---------------- */
setInterval(async () => {

  const now = Date.now();
  const result = await db.query("SELECT * FROM devices");

  for (const d of result.rows) {

    if (d.state === "EXPECTED_OFFLINE") continue;

    const diff = now - Number(d.last_seen);

    if (diff < IDLE_AFTER) {
      await db.query("UPDATE devices SET state='ONLINE' WHERE id=$1",[d.id]);
      continue;
    }

    if (diff < LOST_AFTER) {
      await db.query("UPDATE devices SET state='IDLE' WHERE id=$1",[d.id]);
      continue;
    }

    await db.query("UPDATE devices SET state='LOST' WHERE id=$1",[d.id]);

    const exist = await db.query(
      "SELECT 1 FROM alerts WHERE id=$1 AND message='Device not reporting' AND resolved=false",
      [d.id]
    );

    if (exist.rowCount === 0) {
      await db.query(
        "INSERT INTO alerts(id,message,time,acknowledged,resolved) VALUES ($1,'Device not reporting',$2,false,false)",
        [d.id, now]
      );
    }
  }

}, 30000);

/* ---------------- START ---------------- */
app.listen(4000, () => console.log("Collector running on 4000"));
