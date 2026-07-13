"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.findDeviceInventory = findDeviceInventory;
const dbRepository_1 = require("./dbRepository");
async function findDeviceInventory(deviceId) {
    return (0, dbRepository_1.query)("SELECT * FROM device_inventory WHERE device_id=$1", [deviceId]);
}
