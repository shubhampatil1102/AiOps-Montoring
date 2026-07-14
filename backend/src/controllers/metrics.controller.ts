import { Request, Response } from "express";
import { ingestMetrics } from "../services/metrics.service";

export async function postMetrics(req: Request, res: Response) {
  await ingestMetrics(req.body);
  res.send({ ok: true });
}
