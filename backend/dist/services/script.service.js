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
const scriptRepository = __importStar(require("../repositories/script.repository"));
const logger_service_1 = require("./logger.service");
async function getScriptLibrary() {
    const result = await scriptRepository.findScriptLibrary();
    return result.rows;
}
async function runLibraryScript(body) {
    const { device, script_id } = body;
    if (!device || !script_id) {
        return { status: "INVALID" };
    }
    const script = await scriptRepository.findLibraryScript(script_id);
    if (!script.rows.length) {
        return { status: "NOT_FOUND" };
    }
    await scriptRepository.createPendingScriptJob(device, script.rows[0].script);
    return { status: "OK" };
}
async function runScript(body) {
    if (!body || !body.device_id || !body.script) {
        return { status: "INVALID" };
    }
    const { device_id, script } = body;
    const result = await scriptRepository.createPendingScriptJobReturningId(device_id.trim(), script);
    logger_service_1.Logger.info("JOB CREATED:", result.rows[0].id, "for", device_id);
    return { status: "OK", job_id: result.rows[0].id };
}
async function getScriptJobs() {
    const result = await scriptRepository.findRecentScriptJobs();
    return result.rows;
}
async function getScriptApprovals() {
    const result = await scriptRepository.findScriptApprovals();
    return result.rows;
}
async function pullAgentJob(deviceId) {
    const result = await scriptRepository.findNextPendingJob(deviceId);
    if (result.rows.length === 0) {
        return {};
    }
    const job = result.rows[0];
    await scriptRepository.markJobRunning(job.id);
    return {
        job_id: job.id,
        script: job.script,
        timeout: job.timeout || 120
    };
}
async function appendAgentJobLog(body) {
    const { job_id, chunk } = body;
    if (!job_id || chunk === undefined) {
        return { status: "INVALID" };
    }
    await scriptRepository.appendJobOutput(job_id, chunk);
    return { status: "OK" };
}
async function saveAgentJobResult(body) {
    let { job_id, success, output, error } = body;
    success = success === true || success === "true";
    logger_service_1.Logger.info("JOB RESULT:", job_id, success);
    const finishedTime = Date.now();
    await scriptRepository.updateJobResult(job_id, success ? "SUCCESS" : "FAILED", output ?? "", error ?? "", finishedTime);
    return { ok: true };
}
async function saveAgentApproval(body) {
    const { job_id, status, user, message = "", time } = body;
    logger_service_1.Logger.info("APPROVAL RECEIVED:", job_id, status);
    if (!job_id || !status) {
        return { status: "INVALID" };
    }
    if (status === "APPROVED") {
        await scriptRepository.approveJob(job_id, time, user);
    }
    else if (status === "REJECTED") {
        await scriptRepository.rejectJob(job_id, time, user, message);
    }
    return { status: "OK" };
}
