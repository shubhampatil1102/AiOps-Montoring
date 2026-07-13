"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDevices = getDevices;
exports.getDevicesHardware = getDevicesHardware;
exports.getDeviceCompliance = getDeviceCompliance;
exports.getDeviceHardware = getDeviceHardware;
exports.getDeviceUpdates = getDeviceUpdates;
exports.getDeviceInventory = getDeviceInventory;
exports.getDeviceHistory = getDeviceHistory;
exports.getDeviceEvents = getDeviceEvents;
exports.getDevice = getDevice;
const dbRepository_1 = require("../repositories/dbRepository");
async function getDevices(_, res) {
    const result = await (0, dbRepository_1.query)("SELECT * FROM devices");
    res.send(result.rows);
}
async function getDevicesHardware(req, res) {
    const idsParam = String(req.query.ids || "").trim();
    if (!idsParam) {
        return res.send({});
    }
    const ids = idsParam
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean);
    if (!ids.length) {
        return res.send({});
    }
    const result = await (0, dbRepository_1.query)(`SELECT *
     FROM device_hardware
     WHERE device_id = ANY($1::text[])`, [ids]);
    const hardwareByDevice = result.rows.reduce((acc, row) => {
        acc[row.device_id] = row;
        return acc;
    }, {});
    res.send(hardwareByDevice);
}
async function getDeviceCompliance(req, res) {
    const r = await (0, dbRepository_1.query)("SELECT * FROM device_compliance WHERE device_id=$1", [req.params.id]);
    res.send(r.rows[0] || {});
}
async function getDeviceHardware(req, res) {
    const r = await (0, dbRepository_1.query)("SELECT * FROM device_hardware WHERE device_id=$1", [req.params.id]);
    res.send(r.rows[0] || {});
}
async function getDeviceUpdates(req, res) {
    const r = await (0, dbRepository_1.query)("SELECT * FROM device_updates WHERE device_id=$1", [req.params.id]);
    res.send(r.rows[0] || {});
}
async function getDeviceInventory(req, res) {
    const r = await (0, dbRepository_1.query)("SELECT * FROM device_inventory WHERE device_id=$1", [req.params.id]);
    res.send(r.rows[0] || {});
}
async function getDeviceHistory(req, res) {
    const range = req.query.range || "1h";
    let duration = 3600;
    if (range === "1d")
        duration = 86400;
    if (range === "1w")
        duration = 604800;
    const since = Date.now() - duration * 1000;
    const result = await (0, dbRepository_1.query)(`SELECT * FROM metrics_history
     WHERE id=$1 AND time > $2
     ORDER BY time ASC`, [req.params.id, since]);
    res.send(result.rows);
}
async function getDeviceEvents(req, res) {
    const result = await (0, dbRepository_1.query)(`SELECT * FROM device_events
     WHERE id=$1
     ORDER BY time DESC
     LIMIT 100`, [req.params.id]);
    res.send(result.rows.map(r => ({
        ...r,
        time: Number(r.time)
    })));
}
async function getDevice(req, res) {
    const result = await (0, dbRepository_1.query)("SELECT * FROM devices WHERE id=$1", [req.params.id]);
    res.send(result.rows[0] || {});
}
