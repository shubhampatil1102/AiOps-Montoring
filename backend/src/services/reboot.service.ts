import * as patchService from "./patch.service";
import * as rebootRepository from "../repositories/reboot.repository";
import { Logger } from "./logger.service";

export async function getDeviceRebootFacts(deviceId: string) {
  const [facts, policies] = await Promise.all([
    rebootRepository.findDeviceRebootFacts(deviceId),
    rebootRepository.findRebootPolicies(),
  ]);

  const row = facts.rows[0];
  if (!row) return null;

  const deviceClass = row.device_class || "unknown";
  const policy = policies.rows.find((p) => p.device_class === deviceClass)
    ?? policies.rows.find((p) => p.device_class === "unknown");

  return {
    ...row,
    device_class: deviceClass,
    max_uptime_days: policy?.max_uptime_days ?? 7,
  };
}

export async function getDeviceRebootHistory(deviceId: string) {
  const result = await rebootRepository.findDeviceRebootHistory(deviceId);
  return result.rows;
}

export async function createAdHocReboot(deviceId: string, requestedBy: string | null) {
  Logger.info("SMART RESTART REQUESTED:", deviceId);
  return patchService.createAdHocRebootJob(deviceId, requestedBy);
}

export async function getFleetSummary() {
  const result = await rebootRepository.findFleetRebootSummary();
  const row = result.rows[0] ?? {};

  return {
    healthy: Number(row.healthy ?? 0),
    due: Number(row.due ?? 0),
    overdue: Number(row.overdue ?? 0),
    pendingRestart: Number(row.pending_restart ?? 0),
    avgUptimeDays: row.avg_uptime_days !== null && row.avg_uptime_days !== undefined ? Number(row.avg_uptime_days) : null,
    highestUptimeDays: row.highest_uptime_days !== null && row.highest_uptime_days !== undefined ? Number(row.highest_uptime_days) : null,
    lowestUptimeDays: row.lowest_uptime_days !== null && row.lowest_uptime_days !== undefined ? Number(row.lowest_uptime_days) : null,
    recommendedToday: Number(row.recommended_today ?? 0),
  };
}
