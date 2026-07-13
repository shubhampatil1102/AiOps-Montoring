"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPolicies = getPolicies;
exports.savePolicies = savePolicies;
const dbRepository_1 = require("../repositories/dbRepository");
const policyService_1 = require("../services/policyService");
async function getPolicies(_, res) {
    const result = await (0, dbRepository_1.query)(`SELECT cpu_threshold, ram_threshold, offline_seconds
     FROM policies
     ORDER BY id ASC
     LIMIT 1`);
    res.send(result.rows[0] || (0, policyService_1.getPolicy)());
}
async function savePolicies(req, res) {
    const cpuThreshold = Number(req.body?.cpu_threshold);
    const ramThreshold = Number(req.body?.ram_threshold);
    const offlineSeconds = Number(req.body?.offline_seconds);
    if (!Number.isFinite(cpuThreshold) ||
        !Number.isFinite(ramThreshold) ||
        !Number.isFinite(offlineSeconds)) {
        return res.status(400).send({ error: "Invalid policy payload" });
    }
    const existing = await (0, dbRepository_1.query)("SELECT id FROM policies ORDER BY id ASC LIMIT 1");
    if (existing.rows[0]) {
        await (0, dbRepository_1.query)(`UPDATE policies
       SET cpu_threshold=$1,
           ram_threshold=$2,
           offline_seconds=$3
       WHERE id=$4`, [cpuThreshold, ramThreshold, offlineSeconds, existing.rows[0].id]);
    }
    else {
        await (0, dbRepository_1.query)(`INSERT INTO policies(cpu_threshold, ram_threshold, offline_seconds, created_at)
       VALUES($1,$2,$3,$4)`, [cpuThreshold, ramThreshold, offlineSeconds, Date.now()]);
    }
    const policy = {
        cpu_threshold: cpuThreshold,
        ram_threshold: ramThreshold,
        offline_seconds: offlineSeconds,
    };
    (0, policyService_1.setPolicy)(policy);
    res.send({ ok: true, policy });
}
