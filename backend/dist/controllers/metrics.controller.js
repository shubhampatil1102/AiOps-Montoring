"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.postMetrics = postMetrics;
const metrics_service_1 = require("../services/metrics.service");
async function postMetrics(req, res) {
    await (0, metrics_service_1.ingestMetrics)(req.body);
    res.send({ ok: true });
}
