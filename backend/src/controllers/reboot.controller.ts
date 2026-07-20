import { Request, Response } from "express";
import * as rebootService from "../services/reboot.service";

export async function getDeviceReboot(req: Request, res: Response) {
  const facts = await rebootService.getDeviceRebootFacts(String(req.params.id));
  if (!facts) return res.status(404).send({ error: "Device not found" });
  res.send(facts);
}

export async function getDeviceRebootHistory(req: Request, res: Response) {
  const history = await rebootService.getDeviceRebootHistory(String(req.params.id));
  res.send(history);
}

export async function postDeviceReboot(req: Request, res: Response) {
  const result = await rebootService.createAdHocReboot(String(req.params.id), req.body?.requested_by ?? null);
  if (result.status === "INVALID") return res.status(400).send({ error: "device_id required" });
  res.send({ job_id: result.job_id });
}

export async function getRebootDashboard(_: Request, res: Response) {
  const summary = await rebootService.getFleetSummary();
  res.send(summary);
}
