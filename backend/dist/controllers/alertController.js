"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAlerts = getAlerts;
exports.acknowledgeAlert = acknowledgeAlert;
const dbRepository_1 = require("../repositories/dbRepository");
async function getAlerts(req, res) {
    const since = Number(req.query.since);
    if (!since || isNaN(since)) {
        const result = await (0, dbRepository_1.query)("SELECT * FROM alerts ORDER BY time DESC LIMIT 100");
        return res.send(result.rows);
    }
    const result = await (0, dbRepository_1.query)("SELECT * FROM alerts WHERE time > $1 ORDER BY time DESC", [since]);
    res.send(result.rows);
}
async function acknowledgeAlert(req, res) {
    await (0, dbRepository_1.query)("UPDATE alerts SET acknowledged=true WHERE time=$1", [req.params.time]);
    res.send({ ok: true });
}
