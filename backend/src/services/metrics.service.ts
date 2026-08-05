import { analyzeDeviceHealth } from "./ai.service";
import { query } from "../repositories/db.repository";
import { addEvent } from "./event.service";
import { Logger } from "./logger.service";
import { getPolicy } from "./policy.service";
import { createSuggestion } from "./suggestion.service";
import { recordMetricSamples } from "./metricsAnalytics.service";
import { insertRebootHistoryRow } from "../repositories/reboot.repository";
import { ingestApplicationData } from "./applicationDiscovery.service";
import { ingestDependencyData } from "./applicationDependency.service";
import { ingestWindowsUpdateData } from "./windowsUpdateInventory.service";
import { ingestUserPrivilegeData } from "./userPrivilege.service";

export async function checkCpuAnomaly(id: string, cpu: number) {
  const result = await query(
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
    await query(
      "INSERT INTO alerts(id,message,time,acknowledged,resolved) VALUES ($1,$2,$3,false,false)",
      [id, msg, Date.now()]
    );
    await addEvent(id, "CPU_ANOMALY", msg);
  }
}

export async function ingestMetrics(body: any) {
  Logger.info("FULL METRICS BODY:", body);

  const { id, cpu, ram, boot_time = null, processes = [] } = body;
  const now = Date.now();

  const previous = await query<{ boot_time: string | null; last_seen: string | null }>(
    "SELECT boot_time, last_seen FROM devices WHERE id=$1",
    [id]
  );
  const previousBootTime = previous.rows[0]?.boot_time ? Number(previous.rows[0].boot_time) : null;
  const previousLastSeen = previous.rows[0]?.last_seen ? Number(previous.rows[0].last_seen) : null;

  await query(
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

  // A changed boot_time on an already-known device is a real detected
  // reboot — reuses this existing ingestion path instead of adding new
  // agent-side reboot reporting.
  if (boot_time && previousBootTime && boot_time !== previousBootTime) {
    try {
      await insertRebootHistoryRow({
        deviceId: id,
        previousBootTime,
        newBootTime: boot_time,
        uptimeBeforeRebootMs: previousLastSeen ? previousLastSeen - previousBootTime : null,
        detectedAt: now,
      });
    } catch (err) {
      Logger.info("REBOOT HISTORY INSERT ERROR:", err);
    }
  }

  if (body.compliance) {
    try {
      const c = body.compliance;

      Logger.info("Saving compliance for", id, c);

      await query(`
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
      Logger.info("COMPLIANCE INSERT ERROR:", err);
    }
  }

  if (body.updates) {

    const u = body.updates;

    await query(`
    INSERT INTO device_updates
    (device_id,
     windows_update_status,
     pending_updates,
     failed_updates,
     driver_status,
     outdated_drivers,
     registry_reboot_pending,
     device_class,
     update_source,
     wu_service_status,
     bits_service_status,
     update_medic_status,
     last_scan_at,
     last_successful_scan_at,
     last_failed_scan_at,
     last_install_at,
     scan_duration_ms,
     reboot_reason,
     last_checked)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
    ON CONFLICT(device_id)
    DO UPDATE SET
      windows_update_status=$2,
      pending_updates=$3,
      failed_updates=$4,
      driver_status=$5,
      outdated_drivers=$6,
      registry_reboot_pending=$7,
      device_class=$8,
      update_source=$9,
      wu_service_status=$10,
      bits_service_status=$11,
      update_medic_status=$12,
      last_scan_at=$13,
      last_successful_scan_at=$14,
      last_failed_scan_at=$15,
      last_install_at=$16,
      scan_duration_ms=$17,
      reboot_reason=$18,
      last_checked=$19
  `,
      [
        id,
        u.windows_update_status,
        u.pending_updates,
        u.failed_updates,
        u.driver_status,
        u.outdated_drivers,
        u.registry_reboot_pending ?? false,
        u.device_class ?? null,
        u.update_source ?? null,
        u.wu_service_status ?? null,
        u.bits_service_status ?? null,
        u.update_medic_status ?? null,
        u.last_scan_at ?? null,
        u.last_successful_scan_at ?? null,
        u.last_failed_scan_at ?? null,
        u.last_install_at ?? null,
        u.scan_duration_ms ?? null,
        u.reboot_reason ?? null,
        Date.now()
      ]);
  }

  if (body.update_catalog || body.update_history_entries || body.update_events) {
    try {
      await ingestWindowsUpdateData(id, body);
    } catch (err) {
      Logger.info("WINDOWS UPDATE INVENTORY INGEST ERROR:", err);
    }
  }

  if (body.user_sessions || body.local_administrators || body.uac_status) {
    try {
      await ingestUserPrivilegeData(id, body);
    } catch (err) {
      Logger.info("USER PRIVILEGE INGEST ERROR:", err);
    }
  }

  if (body.inventory) {
    try {
      const inventory = body.inventory;

      await query(`
        INSERT INTO device_inventory
        (device_id, services_summary, drivers_summary, updated_at)
        VALUES ($1, $2::jsonb, $3::jsonb, $4)
        ON CONFLICT(device_id)
        DO UPDATE SET
          services_summary = $2::jsonb,
          drivers_summary = $3::jsonb,
          updated_at = $4
      `,
        [
          id,
          JSON.stringify(inventory.services || {}),
          JSON.stringify(inventory.drivers || {}),
          Date.now()
        ]
      );
    } catch (err) {
      Logger.info("INVENTORY SAVE ERROR:", err);
    }
  }

  if (body.installed_applications || body.running_processes || body.application_services) {
    try {
      await ingestApplicationData(id, body);
    } catch (err) {
      Logger.info("APPLICATION DATA INGEST ERROR:", err);
    }
  }

  if (
    body.scheduled_tasks || body.startup_items || body.system_drivers ||
    body.authentication_status || body.network_connections || body.dns_cache
  ) {
    try {
      await ingestDependencyData(id, body);
    } catch (err) {
      Logger.info("DEPENDENCY DATA INGEST ERROR:", err);
    }
  }

  if (body.hardware) {

    const h = body.hardware;

    const score =
      100
      - (h.cpu_temp > 80 ? 25 : 0)
      - (h.disk > 90 ? 25 : 0)
      - (h.battery_health_percent < 20 ? 20 : 0);

    const risk =
      score > 80 ? "LOW" :
        score > 50 ? "MEDIUM" :
          "HIGH";

    await query(`
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
  `,
      [
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
  const aiIssues = await analyzeDeviceHealth(body);

  for (const issue of aiIssues) {

    await createSuggestion(
      id,
      issue.type,
      issue.reason,
      issue.action,
      "AI Generated Fix"
    );
  }

  await query(
    "INSERT INTO metrics_history (id,cpu,ram,time) VALUES ($1,$2,$3,$4)",
    [id, cpu, ram, now]
  );

  try {
    await recordMetricSamples(id, body, now);
  } catch (err) {
    Logger.info("METRIC SAMPLES INSERT ERROR:", err);
  }

  for (const p of processes) {
    await query(
      "INSERT INTO processes (device_id,name,cpu,ram,time) VALUES ($1,$2,$3,$4,$5)",
      [id, p.name, p.cpu, p.ram, now]
    );
  }

  await checkCpuAnomaly(id, cpu);

  const policy = getPolicy();

  if (cpu > policy.cpu_threshold) {

    const top = processes.sort((a: any, b: any) => b.cpu - a.cpu)[0];
    const msg = `High CPU ${cpu}% (${top?.name || "unknown"})`;

    const alert = await query(
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

      await query(
        "UPDATE alerts SET suggestion_id=$1 WHERE time=$2",
        [suggestionId, alert.rows[0].time]
      );
    }
  }

  if (ram > policy.ram_threshold) {
    const top = processes.sort((a: any, b: any) => b.ram - a.ram)[0];
    const msg = `High RAM ${ram}%${top ? ` (${top.name})` : ""}`;

    await query(
      "INSERT INTO alerts(id,message,time,acknowledged,resolved) VALUES ($1,$2,$3,false,false)",
      [id, msg, now]
    );
    await addEvent(id, "RAM_HIGH", msg);
  }
}

export async function attemptAutoHeal(id: string, alertType: string) {
  const rule = await query(
    "SELECT * FROM heal_rules WHERE alert_type=$1 AND auto_enabled=true LIMIT 1",
    [alertType]
  );

  if (!rule.rows[0]) return;

  await query(
    `INSERT INTO script_jobs(device_id,script,status,created_at)
     VALUES($1,$2,'PENDING',$3)`,
    [id, rule.rows[0].script, Date.now()]
  );

  await query(
    "UPDATE alerts SET auto_healed=true WHERE id=$1 AND resolved=false",
    [id]
  );
}
export async function getMetricsHistory(minutes = 30) {
  const result = await query(
  `
  SELECT
    FLOOR(time / 5000) * 5000 AS time,
    ROUND(AVG(cpu)::numeric, 2) AS cpu,
    ROUND(AVG(ram)::numeric, 2) AS ram
  FROM metrics_history
  WHERE time > $1
  GROUP BY FLOOR(time / 5000)
  ORDER BY time ASC
  `,
  [Date.now() - minutes * 60 * 1000]
);

  return result.rows;
}
