"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const issueController_1 = require("../controllers/issueController");
const errorMiddleware_1 = require("../middleware/errorMiddleware");
const router = (0, express_1.Router)();
router.get("/issues", (0, errorMiddleware_1.asyncHandler)(issueController_1.getIssues, {
    statusCode: 500,
    responseBody: { error: "Failed to fetch issues" },
    logMessage: "ISSUES FETCH ERROR:",
}));
router.post("/issues/:id/resolve", (0, errorMiddleware_1.asyncHandler)(issueController_1.resolveIssue, {
    statusCode: 500,
    responseBody: { error: "Failed to resolve issue" },
    logMessage: "RESOLVE ERROR:",
}));
router.post("/issues/:id/escalate", (0, errorMiddleware_1.asyncHandler)(issueController_1.escalateIssue, {
    statusCode: 500,
    responseBody: { error: "Failed to escalate issue" },
    logMessage: "ESCALATE ERROR:",
}));
router.post("/issues/:id/remediate", (0, errorMiddleware_1.asyncHandler)(issueController_1.remediateIssue, {
    statusCode: 500,
    responseBody: { error: "Failed to remediate issue" },
    logMessage: "REMEDIATE ERROR:",
}));
exports.default = router;
