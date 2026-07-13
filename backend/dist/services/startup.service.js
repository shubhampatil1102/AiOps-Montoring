"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeRuntime = initializeRuntime;
const logger_service_1 = require("./logger.service");
const policyService_1 = require("./policyService");
const presenceService_1 = require("./presenceService");
const schemaService_1 = require("./schemaService");
function initializeRuntime() {
    (0, policyService_1.loadPolicy)();
    (0, schemaService_1.ensureInventoryTable)().catch((err) => logger_service_1.Logger.info("INVENTORY TABLE ERROR:", err));
    (0, schemaService_1.ensureRuntimeTables)().catch((err) => logger_service_1.Logger.info("RUNTIME TABLE ERROR:", err));
    (0, presenceService_1.startPresenceMonitor)();
}
