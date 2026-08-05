import { Router } from "express";
import {
  getApplicationCategories,
  getApplicationDetail,
  getApplicationDevices,
  getApplicationHealthHistory,
  getApplicationHistoryFleetWide,
  getApplicationInsights,
  getApplications,
  getApplicationSummary,
  getDeviceApplicationHealth,
  getDeviceApplicationHistory,
  getDeviceApplicationProcesses,
  getDeviceApplicationServices,
  getDeviceApplications,
  getDeviceProcesses,
  postKillProcess,
  postRestartProcess,
  postServiceAction,
} from "../controllers/application.controller";

const router = Router();

router.get("/applications/categories", getApplicationCategories);
router.get("/applications/summary", getApplicationSummary);
router.get("/applications/insights", getApplicationInsights);
router.get("/applications/:id/devices", getApplicationDevices);
router.get("/applications/:id/history", getApplicationHistoryFleetWide);
router.get("/applications/:id/health-history", getApplicationHealthHistory);
router.get("/applications/:id", getApplicationDetail);
router.get("/applications", getApplications);

router.get("/devices/:id/applications", getDeviceApplications);
router.get("/devices/:id/processes", getDeviceProcesses);
router.get("/devices/:id/applications/:appId/processes", getDeviceApplicationProcesses);
router.get("/devices/:id/applications/:appId/services", getDeviceApplicationServices);
router.get("/devices/:id/applications/:appId/health", getDeviceApplicationHealth);
router.get("/devices/:id/applications/:appId/history", getDeviceApplicationHistory);

// Remote actions — all submitted through the existing script_jobs engine
// (POST /scripts/run), not a new job-execution mechanism.
router.post("/devices/:id/processes/:pid/kill", postKillProcess);
router.post("/devices/:id/processes/:pid/restart", postRestartProcess);
router.post("/devices/:id/services/:serviceName/:action", postServiceAction);

export default router;
