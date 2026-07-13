import { Router } from "express";
import {
  escalateIssue,
  getIssues,
  remediateIssue,
  resolveIssue,
} from "../controllers/issueController";
import { asyncHandler } from "../middleware/errorMiddleware";

const router = Router();

router.get("/issues", asyncHandler(getIssues, {
  statusCode: 500,
  responseBody: { error: "Failed to fetch issues" },
  logMessage: "ISSUES FETCH ERROR:",
}));
router.post("/issues/:id/resolve", asyncHandler(resolveIssue, {
  statusCode: 500,
  responseBody: { error: "Failed to resolve issue" },
  logMessage: "RESOLVE ERROR:",
}));
router.post("/issues/:id/escalate", asyncHandler(escalateIssue, {
  statusCode: 500,
  responseBody: { error: "Failed to escalate issue" },
  logMessage: "ESCALATE ERROR:",
}));
router.post("/issues/:id/remediate", asyncHandler(remediateIssue, {
  statusCode: 500,
  responseBody: { error: "Failed to remediate issue" },
  logMessage: "REMEDIATE ERROR:",
}));

export default router;
