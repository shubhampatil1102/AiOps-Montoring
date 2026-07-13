"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadPolicy = loadPolicy;
exports.getPolicy = getPolicy;
exports.setPolicy = setPolicy;
exports.getPolicies = getPolicies;
exports.savePolicies = savePolicies;
const policyRepository = __importStar(require("../repositories/policy.repository"));
let POLICY = {
    cpu_threshold: 80,
    ram_threshold: 85,
    offline_seconds: 20,
};
async function loadPolicy() {
    const result = await policyRepository.findFirstPolicy();
    if (result.rows[0])
        POLICY = result.rows[0];
}
function getPolicy() {
    return POLICY;
}
function setPolicy(policy) {
    POLICY = policy;
}
async function getPolicies() {
    const result = await policyRepository.findFirstPolicySettings();
    return result.rows[0] || getPolicy();
}
async function savePolicies(body) {
    const cpuThreshold = Number(body?.cpu_threshold);
    const ramThreshold = Number(body?.ram_threshold);
    const offlineSeconds = Number(body?.offline_seconds);
    if (!Number.isFinite(cpuThreshold) ||
        !Number.isFinite(ramThreshold) ||
        !Number.isFinite(offlineSeconds)) {
        return { ok: false };
    }
    const existing = await policyRepository.findFirstPolicyId();
    if (existing.rows[0]) {
        await policyRepository.updatePolicy(existing.rows[0].id, cpuThreshold, ramThreshold, offlineSeconds);
    }
    else {
        await policyRepository.insertPolicy(cpuThreshold, ramThreshold, offlineSeconds, Date.now());
    }
    const policy = {
        cpu_threshold: cpuThreshold,
        ram_threshold: ramThreshold,
        offline_seconds: offlineSeconds,
    };
    setPolicy(policy);
    return { ok: true, policy };
}
