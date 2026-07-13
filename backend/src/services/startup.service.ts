import { Logger } from "./logger.service";
import { loadPolicy } from "./policyService";
import { startPresenceMonitor } from "./presenceService";
import { ensureInventoryTable, ensureRuntimeTables } from "./schemaService";

export function initializeRuntime() {
  loadPolicy();
  ensureInventoryTable().catch((err) => Logger.info("INVENTORY TABLE ERROR:", err));
  ensureRuntimeTables().catch((err) => Logger.info("RUNTIME TABLE ERROR:", err));
  startPresenceMonitor();
}
