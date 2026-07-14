"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.findFirstPolicy = findFirstPolicy;
exports.findFirstPolicySettings = findFirstPolicySettings;
exports.findFirstPolicyId = findFirstPolicyId;
exports.updatePolicy = updatePolicy;
exports.insertPolicy = insertPolicy;
const db_repository_1 = require("./db.repository");
async function findFirstPolicy() {
    return (0, db_repository_1.query)("SELECT * FROM policies LIMIT 1");
}
async function findFirstPolicySettings() {
    return (0, db_repository_1.query)(`SELECT cpu_threshold, ram_threshold, offline_seconds
     FROM policies
     ORDER BY id ASC
     LIMIT 1`);
}
async function findFirstPolicyId() {
    return (0, db_repository_1.query)("SELECT id FROM policies ORDER BY id ASC LIMIT 1");
}
async function updatePolicy(id, cpuThreshold, ramThreshold, offlineSeconds) {
    return (0, db_repository_1.query)(`UPDATE policies
       SET cpu_threshold=$1,
           ram_threshold=$2,
           offline_seconds=$3
       WHERE id=$4`, [cpuThreshold, ramThreshold, offlineSeconds, id]);
}
async function insertPolicy(cpuThreshold, ramThreshold, offlineSeconds, createdAt) {
    return (0, db_repository_1.query)(`INSERT INTO policies(cpu_threshold, ram_threshold, offline_seconds, created_at)
       VALUES($1,$2,$3,$4)`, [cpuThreshold, ramThreshold, offlineSeconds, createdAt]);
}
