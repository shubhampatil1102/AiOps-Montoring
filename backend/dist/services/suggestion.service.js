"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSuggestion = createSuggestion;
const db_repository_1 = require("../repositories/db.repository");
async function createSuggestion(device_id, type, reason, action, script) {
    const result = await (0, db_repository_1.query)(`INSERT INTO heal_suggestions(device_id,alert_type,reason,suggested_action,script,created_at)
     VALUES($1,$2,$3,$4,$5,$6) RETURNING id`, [device_id, type, reason, action, script, Date.now()]);
    return result.rows[0].id;
}
