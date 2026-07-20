import { Router } from "express";

import {
  postMetrics,
  fetchMetricsHistory,
} from "../controllers/metrics.controller";

const router = Router();

router.post("/metrics", postMetrics);

router.get(
  "/metrics/history",
  fetchMetricsHistory
);

export default router;