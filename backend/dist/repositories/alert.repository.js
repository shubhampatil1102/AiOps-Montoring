"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.findRecentAlerts = findRecentAlerts;
exports.findAlertsSince = findAlertsSince;
exports.acknowledgeAlertByTime = acknowledgeAlertByTime;
const db_repository_1 = require("./db.repository");
async function findRecentAlerts() {
    return (0, db_repository_1.query)("SELECT * FROM alerts ORDER BY time DESC LIMIT 100");
}
async function findAlertsSince(since) {
    return (0, db_repository_1.query)("SELECT * FROM alerts WHERE time > $1 ORDER BY time DESC", [since]);
}
async function acknowledgeAlertByTime(time) {
    return (0, db_repository_1.query)("UPDATE alerts SET acknowledged=true WHERE time=$1", [time]);
}
