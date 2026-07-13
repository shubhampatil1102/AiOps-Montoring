"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.query = query;
const database_1 = require("../config/database");
function query(text, params) {
    return database_1.db.query(text, params);
}
