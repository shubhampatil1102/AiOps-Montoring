"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.db = void 0;
const pg_1 = require("pg");
const env_1 = require("./env");
exports.db = new pg_1.Pool({
    host: env_1.env.dbHost,
    port: parseInt(env_1.env.dbPort),
    user: env_1.env.dbUser,
    password: env_1.env.dbPassword,
    database: env_1.env.dbName,
});
