import { Request, Response } from "express";
import * as applicationActionsService from "../services/applicationActions.service";
import * as applicationDependencyService from "../services/applicationDependency.service";

export async function getApplicationDependencyGraph(req: Request, res: Response) {
  const result = await applicationDependencyService.getApplicationDependencyGraph(
    String(req.params.id),
    Number(req.params.appId)
  );
  res.send(result);
}

export async function getApplicationDependencyNetwork(req: Request, res: Response) {
  const result = await applicationDependencyService.getApplicationDependencyGraph(
    String(req.params.id),
    Number(req.params.appId)
  );
  res.send({ network: result.network, dns: result.dns, edges: result.edges });
}

export async function getApplicationDependencyAuthentication(req: Request, res: Response) {
  const result = await applicationDependencyService.getDeviceAuthenticationStatus(String(req.params.id));
  res.send(result);
}

export async function getApplicationDependencyTimeline(req: Request, res: Response) {
  const result = await applicationDependencyService.getApplicationDependencyGraph(
    String(req.params.id),
    Number(req.params.appId)
  );
  res.send(result.events);
}

export async function postFlushDns(req: Request, res: Response) {
  const result = await applicationActionsService.flushDns(String(req.params.id));
  if (result.status === "INVALID") return res.status(400).send({ error: "Invalid device" });
  res.send({ job_id: result.job_id });
}

export async function postScheduledTaskAction(req: Request, res: Response) {
  const action = req.params.action as "enable" | "disable" | "run";
  if (!["enable", "disable", "run"].includes(action)) {
    return res.status(400).send({ error: "Invalid action" });
  }

  const { taskPath, taskName } = req.body ?? {};
  if (!taskPath || !taskName) {
    return res.status(400).send({ error: "taskPath and taskName required" });
  }

  const result = await applicationActionsService.scheduledTaskAction(
    String(req.params.id), String(taskPath), String(taskName), action
  );
  if (result.status === "INVALID") return res.status(400).send({ error: "Unknown or unsafe scheduled task" });
  res.send({ job_id: result.job_id });
}

export async function postCollectDependencyLogs(req: Request, res: Response) {
  const { processName } = req.body ?? {};
  if (!processName) return res.status(400).send({ error: "processName required" });

  const result = await applicationActionsService.collectDependencyLogs(String(req.params.id), String(processName));
  if (result.status === "INVALID") return res.status(400).send({ error: "Invalid process name" });
  res.send({ job_id: result.job_id });
}
