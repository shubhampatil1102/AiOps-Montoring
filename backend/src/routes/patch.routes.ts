import { Router } from "express";
import {
  getDevicePatchHistory,
  getPatchJob,
  getPatchJobs,
  getPatchSummary,
  postPatchCancel,
  postPatchInstall,
  postPatchJobProgress,
  postPatchReboot,
  postPatchRetry,
  postPatchScan,
} from "../controllers/patch.controller";

const router = Router();

router.get("/patch/jobs", getPatchJobs);
router.get("/patch/jobs/:id", getPatchJob);
router.post("/patch/jobs/scan", postPatchScan);
router.post("/patch/jobs/install", postPatchInstall);
router.post("/patch/jobs/:id/retry", postPatchRetry);
router.post("/patch/jobs/:id/cancel", postPatchCancel);
router.post("/patch/jobs/:id/reboot", postPatchReboot);
router.get("/patch/summary", getPatchSummary);
router.get("/devices/:id/patch/history", getDevicePatchHistory);
router.post("/agent/patch-job/progress", postPatchJobProgress);

export default router;
