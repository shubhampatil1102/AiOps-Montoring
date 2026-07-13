"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkCpuAnomaly = checkCpuAnomaly;
exports.ingestMetrics = ingestMetrics;
exports.attemptAutoHeal = attemptAutoHeal;
const ai_service_1 = require("./ai.service");
const dbRepository_1 = require("../repositories/dbRepository");
const eventService_1 = require("./eventService");
const logger_service_1 = require("./logger.service");
const policyService_1 = require("./policyService");
const suggestionService_1 = require("./suggestionService");
async function checkCpuAnomaly(id, cpu) {
    const result = await (0, dbRepository_1.query)(`SELECT cpu FROM metrics_history
     WHERE id=$1 ORDER BY time DESC LIMIT 20`, [id]);
    if (result.rows.length < 10)
        return;
    const avg = result.rows.reduce((a, b) => a + Number(b.cpu), 0) /
        result.rows.length;
    if (cpu > avg * 1.8) {
        const msg = `CPU anomaly (${cpu}% vs avg ${avg.toFixed(1)}%)`;
        await (0, dbRepository_1.query)("INSERT INTO alerts(id,message,time,acknowledged,resolved) VALUES ($1,$2,$3,false,false)", [id, msg, Date.now()]);
        await (0, eventService_1.addEvent)(id, "CPU_ANOMALY", msg);
    }
}
async function ingestMetrics(body) {
    logger_service_1.Logger.info("FULL METRICS BODY:", body);
    const { id, cpu, ram, boot_time = null, processes = [] } = body;
    const now = Date.now();
    logger_service_1.Logger.info("FULL METRICS BODY:", body);
    await (0, dbRepository_1.query)(`INSERT INTO devices (id,cpu,ram,time,last_seen,state,boot_time)
     VALUES ($1,$2,$3,$4,$4,'ONLINE',$5)
     ON CONFLICT (id)
     DO UPDATE SET
       cpu=$2,
       ram=$3,
       time=$4,
       last_seen=$4,
       state='ONLINE',
       boot_time=$5`, [id, cpu, ram, now, boot_time]);
    if (body.compliance) {
        try {
            const c = body.compliance;
            logger_service_1.Logger.info("Saving compliance for", id, c);
            await (0, dbRepository_1.query)(`
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
            logger_service_1.Logger.info("COMPLIANCE INSERT ERROR:", err);
        }
    }
    if (body.updates) {
        const u = body.updates;
        await (0, dbRepository_1.query)(`
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
    if (body.inventory) {
        try {
            const inventory = body.inventory;
            await (0, dbRepository_1.query)(`
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
            logger_service_1.Logger.info("INVENTORY SAVE ERROR:", err);
        }
    }
    if (body.hardware) {
        const h = body.hardware;
        const score = 100
            - (h.cpu_temp > 80 ? 25 : 0)
            - (h.disk > 90 ? 25 : 0)
            - (h.battery_health_percent < 20 ? 20 : 0);
        const risk = score > 80 ? "LOW" :
            score > 50 ? "MEDIUM" :
                "HIGH";
        await (0, dbRepository_1.query)(`
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
    const aiIssues = await (0, ai_service_1.analyzeDeviceHealth)(body);
    for (const issue of aiIssues) {
        await (0, suggestionService_1.createSuggestion)(id, issue.type, issue.reason, issue.action, "AI Generated Fix");
    }
    await (0, dbRepository_1.query)("INSERT INTO metrics_history (id,cpu,ram,time) VALUES ($1,$2,$3,$4)", [id, cpu, ram, now]);
    for (const p of processes) {
        await (0, dbRepository_1.query)("INSERT INTO processes (device_id,name,cpu,ram,time) VALUES ($1,$2,$3,$4,$5)", [id, p.name, p.cpu, p.ram, now]);
    }
    await checkCpuAnomaly(id, cpu);
    const policy = (0, policyService_1.getPolicy)();
    if (cpu > policy.cpu_threshold) {
        const top = processes.sort((a, b) => b.cpu - a.cpu)[0];
        const msg = `High CPU ${cpu}% (${top?.name || "unknown"})`;
        const alert = await (0, dbRepository_1.query)("INSERT INTO alerts(id,message,time,acknowledged,resolved) VALUES ($1,$2,$3,false,false) RETURNING time", [id, msg, now]);
        if (top) {
            const suggestionId = await (0, suggestionService_1.createSuggestion)(id, "CPU_HIGH", `${top.name} using ${top.cpu}% CPU`, `Kill process ${top.name}`, `Stop-Process -Name "${top.name}" -Force`);
            await (0, dbRepository_1.query)("UPDATE alerts SET suggestion_id=$1 WHERE time=$2", [suggestionId, alert.rows[0].time]);
        }
    }
    if (ram > policy.ram_threshold) {
        const top = processes.sort((a, b) => b.ram - a.ram)[0];
        const msg = `High RAM ${ram}%${top ? ` (${top.name})` : ""}`;
        await (0, dbRepository_1.query)("INSERT INTO alerts(id,message,time,acknowledged,resolved) VALUES ($1,$2,$3,false,false)", [id, msg, now]);
        await (0, eventService_1.addEvent)(id, "RAM_HIGH", msg);
    }
}
async function attemptAutoHeal(id, alertType) {
    const rule = await (0, dbRepository_1.query)("SELECT * FROM heal_rules WHERE alert_type=$1 AND auto_enabled=true LIMIT 1", [alertType]);
    if (!rule.rows[0])
        return;
    await (0, dbRepository_1.query)(`INSERT INTO script_jobs(device_id,script,status,created_at)
     VALUES($1,$2,'PENDING',$3)`, [id, rule.rows[0].script, Date.now()]);
    await (0, dbRepository_1.query)("UPDATE alerts SET auto_healed=true WHERE id=$1 AND resolved=false", [id]);
}
