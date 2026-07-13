"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSuggestion = createSuggestion;
const dbRepository_1 = require("../repositories/dbRepository");
async function createSuggestion(device_id, type, reason, action, script) {
    const result = await (0, dbRepository_1.query)(`INSERT INTO heal_suggestions(device_id,alert_type,reason,suggested_action,script,created_at)
     VALUES($1,$2,$3,$4,$5,$6) RETURNING id`, [device_id, type, reason, action, script, Date.now()]);
    return result.rows[0].id;
}
