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
exports.getDevices = getDevices;
exports.getDevicesHardware = getDevicesHardware;
exports.getDeviceCompliance = getDeviceCompliance;
exports.getDeviceHardware = getDeviceHardware;
exports.getDeviceUpdates = getDeviceUpdates;
exports.getDeviceHistory = getDeviceHistory;
exports.getDeviceEvents = getDeviceEvents;
exports.getTopProcesses = getTopProcesses;
exports.getDevice = getDevice;
const deviceRepository = __importStar(require("../repositories/device.repository"));
async function getDevices() {
    const result = await deviceRepository.findAllDevices();
    return result.rows;
}
async function getDevicesHardware(idsParam) {
    const normalizedIdsParam = String(idsParam || "").trim();
    if (!normalizedIdsParam) {
        return {};
    }
    const ids = normalizedIdsParam
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean);
    if (!ids.length) {
        return {};
    }
    const result = await deviceRepository.findHardwareByDeviceIds(ids);
    return result.rows.reduce((acc, row) => {
        acc[row.device_id] = row;
        return acc;
    }, {});
}
async function getDeviceCompliance(id) {
    const r = await deviceRepository.findDeviceCompliance(id);
    return r.rows[0] || {};
}
async function getDeviceHardware(id) {
    const r = await deviceRepository.findDeviceHardware(id);
    return r.rows[0] || {};
}
async function getDeviceUpdates(id) {
    const r = await deviceRepository.findDeviceUpdates(id);
    return r.rows[0] || {};
}
async function getDeviceHistory(id, range) {
    let duration = 3600;
    if (range === "1d")
        duration = 86400;
    if (range === "1w")
        duration = 604800;
    const since = Date.now() - duration * 1000;
    const result = await deviceRepository.findDeviceHistory(id, since);
    return result.rows;
}
async function getDeviceEvents(id) {
    const result = await deviceRepository.findDeviceEvents(id);
    return result.rows.map(r => ({
        ...r,
        time: Number(r.time)
    }));
}
async function getTopProcesses(id) {
    const since = Date.now() - 600000;
    const result = await deviceRepository.findTopProcesses(id, since);
    return result.rows;
}
async function getDevice(id) {
    const result = await deviceRepository.findDeviceById(id);
    return result.rows[0] || {};
}
