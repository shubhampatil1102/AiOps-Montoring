import { Request, Response } from "express";
import * as alertService from "../services/alert.service";

export async function getAlerts(req: Request, res: Response) {
  const alerts = await alertService.getAlerts(req.query.since);
  res.send(alerts);
}

export async function acknowledgeAlert(req: Request, res: Response) {
  await alertService.acknowledgeAlert(String(req.params.time));
  res.send({ ok: true });
}
