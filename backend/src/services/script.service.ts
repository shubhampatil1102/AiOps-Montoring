import * as scriptRepository from "../repositories/script.repository";
import { Logger } from "./logger.service";

export async function getScriptLibrary() {
  const result = await scriptRepository.findScriptLibrary();
  return result.rows;
}

export async function runLibraryScript(body: any) {
  const { device, script_id } = body;

  if (!device || !script_id) {
    return { status: "INVALID" as const };
  }

  const script = await scriptRepository.findLibraryScript(script_id);

  if (!script.rows.length) {
    return { status: "NOT_FOUND" as const };
  }

  await scriptRepository.createPendingScriptJob(device, script.rows[0].script);
  return { status: "OK" as const };
}

export async function runScript(body: any) {
  if (!body || !body.device_id || !body.script) {
    return { status: "INVALID" as const };
  }

  const { device_id, script } = body;

  const result = await scriptRepository.createPendingScriptJobReturningId(
    device_id.trim(),
    script
  );

  Logger.info("JOB CREATED:", result.rows[0].id, "for", device_id);

  return { status: "OK" as const, job_id: result.rows[0].id };
}

export async function getScriptJobs() {
  const result = await scriptRepository.findRecentScriptJobs();
  return result.rows;
}

export async function cancelScriptJob(jobId: number) {
  const existing = await scriptRepository.findScriptJobById(jobId);
  const job = existing.rows[0];

  if (!job) return { status: "NOT_FOUND" as const };
  if (job.status !== "PENDING" && job.status !== "RUNNING") {
    return { status: "CONFLICT" as const };
  }

  const result = await scriptRepository.cancelScriptJob(jobId);
  if (result.rowCount === 0) return { status: "CONFLICT" as const };

  Logger.info("JOB CANCELLED:", jobId);
  return { status: "OK" as const };
}

export async function deleteScriptJob(jobId: number) {
  const result = await scriptRepository.deleteScriptJob(jobId);
  if (result.rowCount === 0) return { status: "NOT_FOUND" as const };

  Logger.info("JOB DELETED:", jobId);
  return { status: "OK" as const };
}

export async function getScriptApprovals() {
  const result = await scriptRepository.findScriptApprovals();
  return result.rows;
}

export async function pullAgentJob(deviceId: string) {
  const result = await scriptRepository.findNextPendingJob(deviceId);

  if (result.rows.length === 0) {
    return {};
  }

  const job = result.rows[0];

  await scriptRepository.markJobRunning(job.id);

  return {
    job_id: job.id,
    script: job.script,
    timeout: job.timeout || 120
  };
}

export async function appendAgentJobLog(body: any) {
  const { job_id, chunk } = body;

  if (!job_id || chunk === undefined) {
    return { status: "INVALID" as const };
  }

  await scriptRepository.appendJobOutput(job_id, chunk);
  return { status: "OK" as const };
}

export async function saveAgentJobResult(body: any) {
  let { job_id, success, output, error } = body;

  success = success === true || success === "true";

  Logger.info("JOB RESULT:", job_id, success);

  const finishedTime = Date.now();

  await scriptRepository.updateJobResult(
    job_id,
    success ? "SUCCESS" : "FAILED",
    output ?? "",
    error ?? "",
    finishedTime
  );

  return { ok: true };
}

export async function saveAgentApproval(body: any) {
  const { job_id, status, user, message = "", time } = body;

  Logger.info("APPROVAL RECEIVED:", job_id, status);

  if (!job_id || !status) {
    return { status: "INVALID" as const };
  }

  if (status === "APPROVED") {
    await scriptRepository.approveJob(job_id, time, user);
  }
  else if (status === "REJECTED") {
    await scriptRepository.rejectJob(job_id, time, user, message);
  }

  return { status: "OK" as const };
}
