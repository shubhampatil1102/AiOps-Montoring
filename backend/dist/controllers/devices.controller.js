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
const deviceService = __importStar(require("../services/device.service"));
async function getDevices(_, res) {
    const devices = await deviceService.getDevices();
    res.send(devices);
}
async function getDevicesHardware(req, res) {
    const hardwareByDevice = await deviceService.getDevicesHardware(String(req.query.ids || ""));
    res.send(hardwareByDevice);
}
async function getDeviceCompliance(req, res) {
    const compliance = await deviceService.getDeviceCompliance(String(req.params.id));
    res.send(compliance);
}
async function getDeviceHardware(req, res) {
    const hardware = await deviceService.getDeviceHardware(String(req.params.id));
    res.send(hardware);
}
async function getDeviceUpdates(req, res) {
    const updates = await deviceService.getDeviceUpdates(String(req.params.id));
    res.send(updates);
}
async function getDeviceHistory(req, res) {
    const range = req.query.range || "1h";
    const history = await deviceService.getDeviceHistory(String(req.params.id), range);
    res.send(history);
}
async function getDeviceEvents(req, res) {
    const events = await deviceService.getDeviceEvents(String(req.params.id));
    res.send(events);
}
async function getTopProcesses(req, res) {
    const processes = await deviceService.getTopProcesses(String(req.params.id));
    res.send(processes);
}
async function getDevice(req, res) {
    const device = await deviceService.getDevice(String(req.params.id));
    res.send(device);
}
