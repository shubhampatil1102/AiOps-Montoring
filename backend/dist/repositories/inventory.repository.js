"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.findDeviceInventory = findDeviceInventory;
const db_repository_1 = require("./db.repository");
async function findDeviceInventory(deviceId) {
    return (0, db_repository_1.query)("SELECT * FROM device_inventory WHERE device_id=$1", [deviceId]);
}
