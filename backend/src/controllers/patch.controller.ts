import { Request, Response } from "express";
import * as patchService from "../services/patch.service";

export async function getPatchJobs(req: Request, res: Response) {
  const deviceId = req.query.device_id ? String(req.query.device_id) : undefined;
  const jobs = await patchService.getRecentJobs(deviceId);
  res.send(jobs);
}

export async function getPatchJob(req: Request, res: Response) {
  const job = await patchService.getJobById(Number(req.params.id));
  if (!job) return res.status(404).send({ error: "Patch job not found" });
  res.send(job);
}

export async function postPatchScan(req: Request, res: Response) {
  const result = await patchService.createScanJob(req.body?.device_id, req.body?.requested_by ?? null);
  if (result.status === "INVALID") return res.status(400).send({ error: "device_id required" });
  res.send({ job_id: result.job_id });
}

export async function postPatchInstall(req: Request, res: Response) {
  const result = await patchService.createInstallJob(req.body?.device_id, req.body?.requested_by ?? null);
  if (result.status === "INVALID") return res.status(400).send({ error: "device_id required" });
  res.send({ job_id: result.job_id });
}

export async function postPatchRetry(req: Request, res: Response) {
  const result = await patchService.retryPatchJob(Number(req.params.id), req.body?.requested_by ?? null);
  if (result.status === "NOT_FOUND") return res.status(404).send({ error: "Patch job not found" });
  if (result.status === "CONFLICT") {
    return res.status(409).send({ error: "Only failed or cancelled jobs can be retried" });
  }
  res.send({ job_id: result.job_id });
}

export async function postPatchCancel(req: Request, res: Response) {
  const result = await patchService.cancelPatchJob(Number(req.params.id));
  if (result.status === "NOT_FOUND") return res.status(404).send({ error: "Patch job not found" });
  if (result.status === "CONFLICT") {
    return res.status(409).send({ error: "Job is already past the point where it can be cancelled" });
  }
  res.send({ ok: true });
}

export async function postPatchReboot(req: Request, res: Response) {
  const result = await patchService.createRebootJob(Number(req.params.id), req.body?.requested_by ?? null);
  if (result.status === "NOT_FOUND") return res.status(404).send({ error: "Patch job not found" });
  if (result.status === "CONFLICT") {
    return res.status(409).send({ error: "Job is not waiting for a reboot" });
  }
  res.send({ job_id: result.job_id });
}

export async function getDevicePatchHistory(req: Request, res: Response) {
  const history = await patchService.getDeviceHistory(String(req.params.id));
  res.send(history);
}

export async function getPatchSummary(_: Request, res: Response) {
  const summary = await patchService.getFleetSummary();
  res.send(summary);
}

export async function postPatchJobProgress(req: Request, res: Response) {
  const result = await patchService.recordProgress(req.body);
  if (result.status === "INVALID") return res.status(400).send({ error: "invalid progress payload" });
  res.send({ ok: true });
}
