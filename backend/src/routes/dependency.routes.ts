import { Router } from "express";
import {
  getApplicationDependencyAuthentication,
  getApplicationDependencyGraph,
  getApplicationDependencyNetwork,
  getApplicationDependencyTimeline,
  postCollectDependencyLogs,
  postFlushDns,
  postScheduledTaskAction,
} from "../controllers/dependency.controller";

const router = Router();

// Reads — assembled from application_processes/application_services
// (existing) plus dependency_nodes/edges/health/events (new). Root-cause
// correlation and graph rendering are both computed client-side from this
// same data (src/lib/intelligence/dependencyIntelligence.ts), matching this
// codebase's existing convention (Patch/Reboot/Software Intelligence) of
// keeping "AI" logic in the frontend rather than a separate backend service.
router.get("/devices/:id/applications/:appId/dependencies", getApplicationDependencyGraph);
router.get("/devices/:id/applications/:appId/dependencies/network", getApplicationDependencyNetwork);
router.get("/devices/:id/applications/:appId/dependencies/timeline", getApplicationDependencyTimeline);
router.get("/devices/:id/dependencies/authentication", getApplicationDependencyAuthentication);

// Remote actions — same script_jobs engine as every other remote action.
router.post("/devices/:id/dependencies/flush-dns", postFlushDns);
router.post("/devices/:id/dependencies/scheduled-task/:action", postScheduledTaskAction);
router.post("/devices/:id/dependencies/collect-logs", postCollectDependencyLogs);

export default router;
