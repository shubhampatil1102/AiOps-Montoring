import * as patchRepository from "../repositories/patch.repository";
import { Logger } from "./logger.service";

const TERMINAL_STATUSES = new Set(["COMPLETED", "FAILED", "CANCELLED"]);
const CANCELABLE_STATUSES = new Set(["PENDING", "QUEUED", "PREPARING", "DOWNLOADING"]);

export async function createScanJob(deviceId: string, requestedBy: string | null) {
  if (!deviceId) return { status: "INVALID" as const };

  const result = await patchRepository.createPendingPatchJob(deviceId.trim(), "SCAN", null, requestedBy);
  Logger.info("PATCH JOB CREATED (SCAN):", result.rows[0].id, "for", deviceId);
  return { status: "OK" as const, job_id: result.rows[0].id };
}

export async function createInstallJob(deviceId: string, requestedBy: string | null) {
  if (!deviceId) return { status: "INVALID" as const };

  const result = await patchRepository.createPendingPatchJob(deviceId.trim(), "INSTALL", null, requestedBy);
  Logger.info("PATCH JOB CREATED (INSTALL):", result.rows[0].id, "for", deviceId);
  return { status: "OK" as const, job_id: result.rows[0].id };
}

export async function createRebootJob(installJobId: number, requestedBy: string | null) {
  const existing = await patchRepository.findPatchJobById(installJobId);
  const installJob = existing.rows[0];

  if (!installJob) return { status: "NOT_FOUND" as const };
  if (installJob.status !== "WAITING_FOR_REBOOT") return { status: "CONFLICT" as const };

  const result = await patchRepository.createPendingPatchJob(
    installJob.device_id,
    "REBOOT",
    installJobId,
    requestedBy
  );
  Logger.info("PATCH JOB CREATED (REBOOT):", result.rows[0].id, "for", installJob.device_id);
  return { status: "OK" as const, job_id: result.rows[0].id };
}

// Reboot Intelligence's "Smart Restart" entry point — an uptime/registry
// driven reboot with no pending install behind it. Reuses the exact same
// repository call as the install-completion reboot flow above, just with
// no related install job to link back to.
export async function createAdHocRebootJob(deviceId: string, requestedBy: string | null) {
  if (!deviceId) return { status: "INVALID" as const };

  const result = await patchRepository.createPendingPatchJob(deviceId.trim(), "REBOOT", null, requestedBy);
  Logger.info("PATCH JOB CREATED (AD-HOC REBOOT):", result.rows[0].id, "for", deviceId);
  return { status: "OK" as const, job_id: result.rows[0].id };
}

export async function retryPatchJob(jobId: number, requestedBy: string | null) {
  const existing = await patchRepository.findPatchJobById(jobId);
  const job = existing.rows[0];

  if (!job) return { status: "NOT_FOUND" as const };
  if (job.status !== "FAILED" && job.status !== "CANCELLED") {
    return { status: "CONFLICT" as const };
  }

  const result = await patchRepository.createPendingPatchJob(job.device_id, job.action, null, requestedBy);
  Logger.info("PATCH JOB RETRIED:", jobId, "->", result.rows[0].id);
  return { status: "OK" as const, job_id: result.rows[0].id };
}

export async function cancelPatchJob(jobId: number) {
  const existing = await patchRepository.findPatchJobById(jobId);
  const job = existing.rows[0];
  if (!job) return { status: "NOT_FOUND" as const };
  if (!CANCELABLE_STATUSES.has(job.status)) return { status: "CONFLICT" as const };

  const result = await patchRepository.cancelPendingPatchJob(jobId);
  if (result.rowCount === 0) return { status: "CONFLICT" as const };

  await patchRepository.insertPatchHistory({
    deviceId: job.device_id,
    patchJobId: jobId,
    action: job.action,
    status: "CANCELLED",
    updatesInstalled: 0,
    updatesFailed: 0,
    rebootRequired: false,
    summary: "Cancelled before execution completed.",
  });

  return { status: "OK" as const };
}

interface PatchProgressBody {
  job_id?: number;
  status?: string;
  percent?: number;
  detail?: string;
}

export async function recordProgress(body: PatchProgressBody) {
  const { job_id, status, percent, detail } = body ?? {};
  if (!job_id || !status) return { status: "INVALID" as const };

  await patchRepository.updatePatchJobProgress(job_id, status, percent ?? null, detail ?? null);
  return { status: "OK" as const };
}

interface PatchResultBody {
  job_id?: number;
  status?: string;
  updates_total?: number;
  updates_processed?: number;
  updates_failed?: number;
  reboot_required?: boolean;
  error?: string;
}

export async function completeJob(body: PatchResultBody) {
  const {
    job_id,
    status,
    updates_total,
    updates_processed,
    updates_failed,
    reboot_required,
    error,
  } = body ?? {};

  if (!job_id || !status) return { status: "INVALID" as const };

  const existing = await patchRepository.findPatchJobById(job_id);
  const job = existing.rows[0];
  if (!job) return { status: "NOT_FOUND" as const };

  await patchRepository.updatePatchJobTerminal(job_id, status, {
    updatesTotal: updates_total ?? null,
    updatesProcessed: updates_processed ?? null,
    updatesFailed: updates_failed ?? null,
    rebootRequired: reboot_required ?? undefined,
    error: error ?? null,
  });

  Logger.info("PATCH JOB RESULT:", job_id, status);

  if (TERMINAL_STATUSES.has(status)) {
    await patchRepository.insertPatchHistory({
      deviceId: job.device_id,
      patchJobId: job_id,
      action: job.action,
      status,
      updatesInstalled: updates_processed ?? 0,
      updatesFailed: updates_failed ?? 0,
      rebootRequired: Boolean(reboot_required),
      summary: error || null,
    });
  }

  return { status: "OK" as const };
}

export async function getRecentJobs(deviceId?: string) {
  const result = await patchRepository.findRecentPatchJobs(deviceId);
  return result.rows;
}

export async function getJobById(jobId: number) {
  const result = await patchRepository.findPatchJobById(jobId);
  return result.rows[0] ?? null;
}

export async function getDeviceHistory(deviceId: string) {
  const result = await patchRepository.findDevicePatchHistory(deviceId);
  return result.rows;
}

export async function getFleetSummary() {
  return patchRepository.findFleetPatchSummary();
}
