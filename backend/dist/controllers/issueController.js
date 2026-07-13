"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getIssues = getIssues;
exports.resolveIssue = resolveIssue;
exports.escalateIssue = escalateIssue;
exports.remediateIssue = remediateIssue;
const dbRepository_1 = require("../repositories/dbRepository");
const logger_service_1 = require("../services/logger.service");
const parseIssueKey_1 = require("../utils/parseIssueKey");
async function getIssues(_, res) {
    logger_service_1.Logger.info("GET /issues called");
    const result = await (0, dbRepository_1.query)(`SELECT * FROM alerts ORDER BY time DESC LIMIT 100`);
    logger_service_1.Logger.info("Found", result.rows.length, "alerts");
    const issues = result.rows.map((alert) => {
        let type = "other";
        let severity = "medium";
        if (alert.message.toLowerCase().includes("cpu")) {
            type = "performance";
            severity = alert.message.includes("anomaly") ? "high" : "medium";
        }
        else if (alert.message.toLowerCase().includes("ram")) {
            type = "performance";
            severity = "medium";
        }
        else if (alert.message.toLowerCase().includes("security")) {
            type = "security";
            severity = "critical";
        }
        else if (alert.message.toLowerCase().includes("update")) {
            type = "update";
            severity = "low";
        }
        else if (alert.message.toLowerCase().includes("service")) {
            type = "service";
            severity = "high";
        }
        else if (alert.message.toLowerCase().includes("driver")) {
            type = "driver";
            severity = "medium";
        }
        let status = "open";
        if (alert.resolved) {
            status = "resolved";
        }
        else if (alert.acknowledged) {
            status = "in-progress";
        }
        else if (alert.auto_healed) {
            status = "pending";
        }
        return {
            id: `ALERT-${alert.id}-${alert.time}`,
            title: alert.message,
            description: alert.message,
            type,
            severity,
            status,
            device_id: alert.id,
            created_at: alert.time,
            updated_at: alert.time,
            action_required: !alert.resolved && !alert.acknowledged,
            auto_remediation_available: !!alert.suggestion_id || alert.auto_healed
        };
    });
    logger_service_1.Logger.info("Sending", issues.length, "issues");
    res.send(issues);
}
async function resolveIssue(req, res) {
    const parsed = (0, parseIssueKey_1.parseIssueKey)(String(req.params.id));
    if (!parsed) {
        return res.status(400).send({ error: "Invalid issue id" });
    }
    await (0, dbRepository_1.query)("UPDATE alerts SET resolved=true WHERE id=$1 AND time=$2", [parsed.alertId, parsed.alertTime]);
    res.send({ ok: true });
}
async function escalateIssue(req, res) {
    const parsed = (0, parseIssueKey_1.parseIssueKey)(String(req.params.id));
    if (!parsed) {
        return res.status(400).send({ error: "Invalid issue id" });
    }
    await (0, dbRepository_1.query)("UPDATE alerts SET acknowledged=true WHERE id=$1 AND time=$2", [parsed.alertId, parsed.alertTime]);
    res.send({ ok: true });
}
async function remediateIssue(req, res) {
    const parsed = (0, parseIssueKey_1.parseIssueKey)(String(req.params.id));
    if (!parsed) {
        return res.status(400).send({ error: "Invalid issue id" });
    }
    await (0, dbRepository_1.query)("UPDATE alerts SET auto_healed=true WHERE id=$1 AND time=$2", [parsed.alertId, parsed.alertTime]);
    res.send({ ok: true });
}
