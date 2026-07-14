"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addEvent = addEvent;
const db_repository_1 = require("../repositories/db.repository");
async function addEvent(id, type, message) {
    await (0, db_repository_1.query)("INSERT INTO device_events (id,type,message,time) VALUES ($1,$2,$3,$4)", [id, type, message, Date.now()]);
}
