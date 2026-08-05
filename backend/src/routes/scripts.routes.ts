import { Router } from "express";
import {
  appendAgentJobLog,
  deleteScriptJobHandler,
  getScriptApprovals,
  getScriptJobs,
  getScriptLibrary,
  postScriptCancel,
  pullAgentJob,
  runLibraryScript,
  runScript,
  saveAgentApproval,
  saveAgentJobResult,
} from "../controllers/scripts.controller";

const router = Router();

router.get("/scripts/library", getScriptLibrary);
router.post("/scripts/run-library", runLibraryScript);
router.post("/scripts/run", runScript);
router.get("/scripts/jobs", getScriptJobs);
router.post("/scripts/jobs/:id/cancel", postScriptCancel);
router.delete("/scripts/jobs/:id", deleteScriptJobHandler);
router.get("/scripts/approvals", getScriptApprovals);
router.get("/agent/job/:deviceId", pullAgentJob);
router.post("/agent/job/log", appendAgentJobLog);
router.post("/agent/job/result", saveAgentJobResult);
router.post("/agent/job/approval", saveAgentApproval);

export default router;
