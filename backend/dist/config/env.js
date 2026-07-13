"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
exports.env = {
    dbHost: process.env.DB_HOST || "localhost",
    dbPort: process.env.DB_PORT || "5432",
    dbUser: process.env.DB_USER || "postgres",
    dbPassword: process.env.DB_PASSWORD || "admin",
    dbName: process.env.DB_NAME || "aiops",
};
