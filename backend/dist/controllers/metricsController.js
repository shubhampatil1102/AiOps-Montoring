"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.postMetrics = postMetrics;
const metricsService_1 = require("../services/metricsService");
async function postMetrics(req, res) {
    await (0, metricsService_1.ingestMetrics)(req.body);
    res.send({ ok: true });
}
