import { Request, Response } from "express";
import * as applicationActionsService from "../services/applicationActions.service";
import * as applicationRepository from "../repositories/application.repository";

export async function getApplications(_: Request, res: Response) {
  const result = await applicationRepository.findApplications();
  res.send(result.rows);
}

export async function getApplicationDetail(req: Request, res: Response) {
  const applicationId = Number(req.params.id);
  const [app, stats] = await Promise.all([
    applicationRepository.findApplicationById(applicationId),
    applicationRepository.findApplicationAggregateStats(applicationId),
  ]);

  if (!app.rows[0]) return res.status(404).send({ error: "Application not found" });

  const statsRow = stats.rows[0] ?? {};
  res.send({
    ...app.rows[0],
    deviceCount: Number(statsRow.device_count ?? 0),
    runningCount: Number(statsRow.running_count ?? 0),
    avgHealthScore: statsRow.avg_health_score !== null && statsRow.avg_health_score !== undefined ? Number(statsRow.avg_health_score) : null,
    unsignedProcessCount: Number(statsRow.unsigned_process_count ?? 0),
  });
}

export async function getApplicationDevices(req: Request, res: Response) {
  const result = await applicationRepository.findApplicationDeviceBreakdown(Number(req.params.id));
  res.send(result.rows);
}

export async function getApplicationHistoryFleetWide(req: Request, res: Response) {
  const result = await applicationRepository.findApplicationHistoryFleetWide(Number(req.params.id));
  res.send(result.rows);
}

export async function getApplicationHealthHistory(req: Request, res: Response) {
  const days = Number(req.query.days ?? 7);
  const since = Date.now() - days * 24 * 60 * 60 * 1000;
  const result = await applicationRepository.findApplicationHealthHistory(Number(req.params.id), since);
  res.send(result.rows);
}

export async function getApplicationInsights(_: Request, res: Response) {
  const [mostInstalled, mostVersionChanged, mostRestarts, recentlyInstalled, unsigned, topConsumers, publisherBreakdown, categoryBreakdown] = await Promise.all([
    applicationRepository.findMostInstalledApplications(10),
    applicationRepository.findMostVersionChangedApplications(10),
    applicationRepository.findMostServiceRestartsApplications(10),
    applicationRepository.findRecentlyInstalledApplications(10),
    applicationRepository.findUnsignedProcesses(20),
    applicationRepository.findTopResourceConsumers(10),
    applicationRepository.findPublisherBreakdown(),
    applicationRepository.findCategoryBreakdown(),
  ]);

  res.send({
    mostInstalled: mostInstalled.rows,
    mostVersionChanged: mostVersionChanged.rows,
    mostServiceRestarts: mostRestarts.rows,
    recentlyInstalled: recentlyInstalled.rows,
    unsignedSoftware: unsigned.rows,
    topCpu: topConsumers.topCpu,
    topMemory: topConsumers.topMemory,
    publisherBreakdown: publisherBreakdown.rows,
    categoryBreakdown: categoryBreakdown.rows,
  });
}

export async function postKillProcess(req: Request, res: Response) {
  const result = await applicationActionsService.killProcess(String(req.params.id), Number(req.params.pid));
  if (result.status === "INVALID") return res.status(400).send({ error: "Invalid process" });
  res.send({ job_id: result.job_id });
}

export async function postRestartProcess(req: Request, res: Response) {
  const result = await applicationActionsService.restartProcess(String(req.params.id), Number(req.params.pid));
  if (result.status === "INVALID") return res.status(400).send({ error: "Invalid process" });
  res.send({ job_id: result.job_id, relaunched: result.relaunched });
}

export async function postServiceAction(req: Request, res: Response) {
  const action = req.params.action as "restart" | "stop" | "start";
  if (!["restart", "stop", "start"].includes(action)) {
    return res.status(400).send({ error: "Invalid action" });
  }

  const result = await applicationActionsService.serviceAction(String(req.params.id), String(req.params.serviceName), action);
  if (result.status === "INVALID") return res.status(400).send({ error: "Unknown or unsafe service name" });
  res.send({ job_id: result.job_id });
}

export async function getApplicationCategories(_: Request, res: Response) {
  const result = await applicationRepository.findApplicationCategories();
  res.send(result.rows.map((row) => row.category));
}

export async function getApplicationSummary(_: Request, res: Response) {
  const [summary, topConsumers] = await Promise.all([
    applicationRepository.findFleetApplicationSummary(),
    applicationRepository.findTopResourceConsumers(5),
  ]);

  const row = summary.rows[0] ?? {};
  res.send({
    installedApplications: Number(row.installed_applications ?? 0),
    healthy: Number(row.healthy ?? 0),
    warning: Number(row.warning ?? 0),
    critical: Number(row.critical ?? 0),
    topCpu: topConsumers.topCpu,
    topMemory: topConsumers.topMemory,
  });
}

export async function getDeviceApplications(req: Request, res: Response) {
  const result = await applicationRepository.findDeviceInventory(String(req.params.id));
  res.send(result.rows);
}

// All processes on a device, not scoped to one application — reuses the
// same repository function findDeviceApplicationProcesses() already used
// by the per-app route below, just called without an appId.
export async function getDeviceProcesses(req: Request, res: Response) {
  const result = await applicationRepository.findDeviceApplicationProcesses(String(req.params.id));
  res.send(result.rows);
}

export async function getDeviceApplicationProcesses(req: Request, res: Response) {
  const result = await applicationRepository.findDeviceApplicationProcesses(
    String(req.params.id),
    Number(req.params.appId)
  );
  res.send(result.rows);
}

export async function getDeviceApplicationServices(req: Request, res: Response) {
  const result = await applicationRepository.findDeviceApplicationServices(
    String(req.params.id),
    Number(req.params.appId)
  );
  res.send(result.rows);
}

export async function getDeviceApplicationHealth(req: Request, res: Response) {
  const result = await applicationRepository.findDeviceApplicationHealth(
    String(req.params.id),
    Number(req.params.appId)
  );
  res.send(result.rows[0] ?? null);
}

export async function getDeviceApplicationHistory(req: Request, res: Response) {
  const result = await applicationRepository.findDeviceApplicationHistory(
    String(req.params.id),
    Number(req.params.appId)
  );
  res.send(result.rows);
}
