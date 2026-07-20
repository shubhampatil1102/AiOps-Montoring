import { Request, Response } from "express";
import * as analyticsService from "../services/metricsAnalytics.service";

export async function getMetricDefinitions(_: Request, res: Response) {
  const definitions = await analyticsService.getMetricDefinitions();
  res.send(definitions);
}

export async function getMetricHistory(req: Request, res: Response) {
  const since = analyticsService.parseRangeToSince(req.query.range);
  const history = await analyticsService.getMetricHistory(
    String(req.params.id),
    String(req.params.metric),
    since
  );
  res.send(history);
}

export async function getMetricAggregate(req: Request, res: Response) {
  const granularity = String(req.query.granularity || "hour") as
    | "hour"
    | "day"
    | "week"
    | "month"
    | "year";
  const since = analyticsService.parseRangeToSince(req.query.range);

  const aggregate = await analyticsService.getMetricAggregate(
    String(req.params.id),
    String(req.params.metric),
    granularity,
    since
  );
  res.send(aggregate);
}

export async function getMetricBaseline(req: Request, res: Response) {
  const baseline = await analyticsService.getMetricBaseline(
    String(req.params.id),
    String(req.params.metric)
  );
  res.send(baseline);
}

export async function getMetricAnomalies(req: Request, res: Response) {
  const since = analyticsService.parseRangeToSince(req.query.range);
  const anomalies = await analyticsService.getMetricAnomalies(
    String(req.params.id),
    String(req.params.metric),
    since
  );
  res.send(anomalies);
}

export async function getMetricTrend(req: Request, res: Response) {
  const period = req.query.period === "month" ? "month" : "week";
  const trend = await analyticsService.getMetricTrend(
    String(req.params.id),
    String(req.params.metric),
    period
  );
  res.send(trend);
}
