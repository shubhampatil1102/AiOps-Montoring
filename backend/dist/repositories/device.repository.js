"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.findAllDevices = findAllDevices;
exports.findHardwareByDeviceIds = findHardwareByDeviceIds;
exports.findDeviceCompliance = findDeviceCompliance;
exports.findDeviceHardware = findDeviceHardware;
exports.findDeviceUpdates = findDeviceUpdates;
exports.findDeviceHistory = findDeviceHistory;
exports.findDeviceEvents = findDeviceEvents;
exports.findTopProcesses = findTopProcesses;
exports.findDeviceById = findDeviceById;
const db_repository_1 = require("./db.repository");
async function findAllDevices() {
    return (0, db_repository_1.query)("SELECT * FROM devices");
}
async function findHardwareByDeviceIds(ids) {
    return (0, db_repository_1.query)(`SELECT *
     FROM device_hardware
     WHERE device_id = ANY($1::text[])`, [ids]);
}
async function findDeviceCompliance(deviceId) {
    return (0, db_repository_1.query)("SELECT * FROM device_compliance WHERE device_id=$1", [deviceId]);
}
async function findDeviceHardware(deviceId) {
    return (0, db_repository_1.query)("SELECT * FROM device_hardware WHERE device_id=$1", [deviceId]);
}
async function findDeviceUpdates(deviceId) {
    return (0, db_repository_1.query)("SELECT * FROM device_updates WHERE device_id=$1", [deviceId]);
}
async function findDeviceHistory(deviceId, since) {
    return (0, db_repository_1.query)(`SELECT * FROM metrics_history
     WHERE id=$1 AND time > $2
     ORDER BY time ASC`, [deviceId, since]);
}
async function findDeviceEvents(deviceId) {
    return (0, db_repository_1.query)(`SELECT * FROM device_events
     WHERE id=$1
     ORDER BY time DESC
     LIMIT 100`, [deviceId]);
}
async function findTopProcesses(deviceId, since) {
    return (0, db_repository_1.query)(`SELECT name,
            ROUND(AVG(cpu)::numeric,2) as cpu,
            ROUND(AVG(ram)::numeric,2) as ram
     FROM processes
     WHERE device_id=$1 AND time > $2
     GROUP BY name
     ORDER BY cpu DESC
     LIMIT 5`, [deviceId, since]);
}
async function findDeviceById(deviceId) {
    return (0, db_repository_1.query)("SELECT * FROM devices WHERE id=$1", [deviceId]);
}
