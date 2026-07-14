"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseIssueKey = parseIssueKey;
function parseIssueKey(issueKey) {
    const prefix = "ALERT-";
    if (!issueKey.startsWith(prefix)) {
        return null;
    }
    const lastDash = issueKey.lastIndexOf("-");
    if (lastDash <= prefix.length) {
        return null;
    }
    const alertId = issueKey.slice(prefix.length, lastDash);
    const alertTime = issueKey.slice(lastDash + 1);
    if (!alertId || !alertTime) {
        return null;
    }
    return { alertId, alertTime };
}
