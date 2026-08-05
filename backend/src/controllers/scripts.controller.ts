import { Request, Response } from "express";
import * as agentJobService from "../services/agentJob.service";
import * as scriptService from "../services/script.service";

export async function getScriptLibrary(_: Request, res: Response) {
  const scripts = await scriptService.getScriptLibrary();
  res.send(scripts);
}

export async function runLibraryScript(req: Request, res: Response) {
  const result = await scriptService.runLibraryScript(req.body);

  if (result.status === "INVALID") {
    return res.status(400).send({ error: "device & script_id required" });
  }

  if (result.status === "NOT_FOUND") {
    return res.status(404).send({ error: "Script not found" });
  }

  res.send({ ok: true });
}

export async function runScript(req: Request, res: Response) {
  const result = await scriptService.runScript(req.body);

  if (result.status === "INVALID") {
    return res.status(400).send({ error: "device_id & script required" });
  }

  res.send({ job_id: result.job_id });
}

export async function getScriptJobs(_: Request, res: Response) {
  const jobs = await scriptService.getScriptJobs();
  res.send(jobs);
}

export async function postScriptCancel(req: Request, res: Response) {
  const result = await scriptService.cancelScriptJob(Number(req.params.id));

  if (result.status === "NOT_FOUND") {
    return res.status(404).send({ error: "Script job not found" });
  }

  if (result.status === "CONFLICT") {
    return res.status(409).send({ error: "Only pending or running jobs can be cancelled" });
  }

  res.send({ ok: true });
}

export async function deleteScriptJobHandler(req: Request, res: Response) {
  const result = await scriptService.deleteScriptJob(Number(req.params.id));

  if (result.status === "NOT_FOUND") {
    return res.status(404).send({ error: "Script job not found" });
  }

  res.send({ ok: true });
}

export async function getScriptApprovals(_: Request, res: Response) {
  const approvals = await scriptService.getScriptApprovals();
  res.send(approvals);
}

export async function pullAgentJob(req: Request, res: Response) {
  const job = await agentJobService.pullNextAgentJob(String(req.params.deviceId));
  res.send(job);
}

export async function appendAgentJobLog(req: Request, res: Response) {
  const result = await scriptService.appendAgentJobLog(req.body);

  if (result.status === "INVALID") {
    return res.status(400).send({ error: "invalid log payload" });
  }

  res.send({ ok: true });
}

export async function saveAgentJobResult(req: Request, res: Response) {
  await agentJobService.saveAgentJobResult(req.body);
  res.send({ ok: true });
}

export async function saveAgentApproval(req: Request, res: Response) {
  const result = await scriptService.saveAgentApproval(req.body);

  if (result.status === "INVALID") {
    return res.status(400).send({ error: "Invalid approval payload" });
  }

  res.send({ ok: true });
}
