import { startAggregationJobs } from "./aggregation.service";
import { Logger } from "./logger.service";
import { loadPolicy } from "./policy.service";
import { startPresenceMonitor } from "./presence.service";
import { startRetentionJob } from "./retention.service";
import { ensureAnalyticsTables, ensureAuthTables, ensureInventoryTable, ensurePatchTables, ensureRbacTables, ensureRebootTables, ensureRuntimeTables } from "./schema.service";

export function initializeRuntime() {
  loadPolicy();
  ensureInventoryTable().catch((err) => Logger.info("INVENTORY TABLE ERROR:", err));
  ensureRuntimeTables().catch((err) => Logger.info("RUNTIME TABLE ERROR:", err));
  ensureAnalyticsTables().catch((err) => Logger.info("ANALYTICS TABLE ERROR:", err));
  ensurePatchTables().catch((err) => Logger.info("PATCH TABLE ERROR:", err));
  ensureRebootTables().catch((err) => Logger.info("REBOOT TABLE ERROR:", err));
  // RBAC seeding depends on the users table (and its role column) already
  // existing, so this must be sequenced after auth, not fired concurrently
  // like the independent ensure*Tables() calls above.
  ensureAuthTables()
    .then(() => ensureRbacTables())
    .catch((err) => Logger.info("AUTH/RBAC TABLE ERROR:", err));
  startPresenceMonitor();
  startAggregationJobs();
  startRetentionJob();
}
