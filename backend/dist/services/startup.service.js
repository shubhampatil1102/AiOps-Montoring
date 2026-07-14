"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeRuntime = initializeRuntime;
const logger_service_1 = require("./logger.service");
const policy_service_1 = require("./policy.service");
const presence_service_1 = require("./presence.service");
const schema_service_1 = require("./schema.service");
function initializeRuntime() {
    (0, policy_service_1.loadPolicy)();
    (0, schema_service_1.ensureInventoryTable)().catch((err) => logger_service_1.Logger.info("INVENTORY TABLE ERROR:", err));
    (0, schema_service_1.ensureRuntimeTables)().catch((err) => logger_service_1.Logger.info("RUNTIME TABLE ERROR:", err));
    (0, presence_service_1.startPresenceMonitor)();
}
