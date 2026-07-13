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
exports.getScriptLibrary = getScriptLibrary;
exports.runLibraryScript = runLibraryScript;
exports.runScript = runScript;
exports.getScriptJobs = getScriptJobs;
exports.getScriptApprovals = getScriptApprovals;
exports.pullAgentJob = pullAgentJob;
exports.appendAgentJobLog = appendAgentJobLog;
exports.saveAgentJobResult = saveAgentJobResult;
exports.saveAgentApproval = saveAgentApproval;
const scriptService = __importStar(require("../services/script.service"));
async function getScriptLibrary(_, res) {
    const scripts = await scriptService.getScriptLibrary();
    res.send(scripts);
}
async function runLibraryScript(req, res) {
    const result = await scriptService.runLibraryScript(req.body);
    if (result.status === "INVALID") {
        return res.status(400).send({ error: "device & script_id required" });
    }
    if (result.status === "NOT_FOUND") {
        return res.status(404).send({ error: "Script not found" });
    }
    res.send({ ok: true });
}
async function runScript(req, res) {
    const result = await scriptService.runScript(req.body);
    if (result.status === "INVALID") {
        return res.status(400).send({ error: "device_id & script required" });
    }
    res.send({ job_id: result.job_id });
}
async function getScriptJobs(_, res) {
    const jobs = await scriptService.getScriptJobs();
    res.send(jobs);
}
async function getScriptApprovals(_, res) {
    const approvals = await scriptService.getScriptApprovals();
    res.send(approvals);
}
async function pullAgentJob(req, res) {
    const job = await scriptService.pullAgentJob(String(req.params.deviceId));
    res.send(job);
}
async function appendAgentJobLog(req, res) {
    const result = await scriptService.appendAgentJobLog(req.body);
    if (result.status === "INVALID") {
        return res.status(400).send({ error: "invalid log payload" });
    }
    res.send({ ok: true });
}
async function saveAgentJobResult(req, res) {
    await scriptService.saveAgentJobResult(req.body);
    res.send({ ok: true });
}
async function saveAgentApproval(req, res) {
    const result = await scriptService.saveAgentApproval(req.body);
    if (result.status === "INVALID") {
        return res.status(400).send({ error: "Invalid approval payload" });
    }
    res.send({ ok: true });
}
