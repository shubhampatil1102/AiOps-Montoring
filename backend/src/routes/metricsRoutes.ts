import { Router } from "express";
import { postMetrics } from "../controllers/metricsController";

const router = Router();

router.post("/metrics", postMetrics);

export default router;
