import { Request, Response } from "express";
import {
  ingestMetrics,
  getMetricsHistory,
} from "../services/metrics.service";

export async function postMetrics(req: Request, res: Response) {
  await ingestMetrics(req.body);
  res.send({ ok: true });
}

export async function fetchMetricsHistory(
  req: Request,
  res: Response
) {
  const minutes = Number(req.query.minutes || 30);

  const history = await getMetricsHistory(minutes);

  res.json(history);
}