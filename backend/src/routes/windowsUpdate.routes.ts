import { Router } from "express";
import {
  getDeviceUpdateEvents,
  getDeviceUpdateHistory,
  getDeviceUpdateSummary,
} from "../controllers/windowsUpdate.controller";

const router = Router();

// Reads only — ingestion happens via the existing /metrics endpoint
// (metrics.service.ts), same as every other agent-collected dataset.
router.get("/devices/:id/updates", getDeviceUpdateSummary);
router.get("/devices/:id/updates/history", getDeviceUpdateHistory);
router.get("/devices/:id/updates/events", getDeviceUpdateEvents);

export default router;
