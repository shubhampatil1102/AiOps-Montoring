"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const issues_controller_1 = require("../controllers/issues.controller");
const error_middleware_1 = require("../middleware/error.middleware");
const router = (0, express_1.Router)();
router.get("/issues", (0, error_middleware_1.asyncHandler)(issues_controller_1.getIssues, {
    statusCode: 500,
    responseBody: { error: "Failed to fetch issues" },
    logMessage: "ISSUES FETCH ERROR:",
}));
router.post("/issues/:id/resolve", (0, error_middleware_1.asyncHandler)(issues_controller_1.resolveIssue, {
    statusCode: 500,
    responseBody: { error: "Failed to resolve issue" },
    logMessage: "RESOLVE ERROR:",
}));
router.post("/issues/:id/escalate", (0, error_middleware_1.asyncHandler)(issues_controller_1.escalateIssue, {
    statusCode: 500,
    responseBody: { error: "Failed to escalate issue" },
    logMessage: "ESCALATE ERROR:",
}));
router.post("/issues/:id/remediate", (0, error_middleware_1.asyncHandler)(issues_controller_1.remediateIssue, {
    statusCode: 500,
    responseBody: { error: "Failed to remediate issue" },
    logMessage: "REMEDIATE ERROR:",
}));
exports.default = router;
