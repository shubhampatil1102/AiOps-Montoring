import { Router } from "express";
import {
  getMetricAggregate,
  getMetricAnomalies,
  getMetricBaseline,
  getMetricDefinitions,
  getMetricHistory,
  getMetricTrend,
} from "../controllers/analytics.controller";

const router = Router();

router.get("/analytics/metrics/definitions", getMetricDefinitions);
router.get("/analytics/devices/:id/metrics/:metric/history", getMetricHistory);
router.get("/analytics/devices/:id/metrics/:metric/aggregate", getMetricAggregate);
router.get("/analytics/devices/:id/metrics/:metric/baseline", getMetricBaseline);
router.get("/analytics/devices/:id/metrics/:metric/anomalies", getMetricAnomalies);
router.get("/analytics/devices/:id/metrics/:metric/trend", getMetricTrend);

export default router;
