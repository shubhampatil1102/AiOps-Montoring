import { Logger } from "./logger.service";
import { loadPolicy } from "./policy.service";
import { startPresenceMonitor } from "./presence.service";
import { ensureInventoryTable, ensureRuntimeTables } from "./schema.service";

export function initializeRuntime() {
  loadPolicy();
  ensureInventoryTable().catch((err) => Logger.info("INVENTORY TABLE ERROR:", err));
  ensureRuntimeTables().catch((err) => Logger.info("RUNTIME TABLE ERROR:", err));
  startPresenceMonitor();
}
