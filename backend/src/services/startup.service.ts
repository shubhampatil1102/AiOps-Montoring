import { startAggregationJobs } from "./aggregation.service";
import { startCloudStatusPoller } from "./cloudStatus.service";
import { Logger } from "./logger.service";
import { loadPolicy } from "./policy.service";
import { startPresenceMonitor } from "./presence.service";
import { startRetentionJob } from "./retention.service";
import { ensureAnalyticsTables, ensureApplicationTables, ensureAuthTables, ensureDependencyTables, ensureInventoryTable, ensurePatchTables, ensureRbacTables, ensureRebootTables, ensureRuntimeTables, ensureUserPrivilegeTables, ensureWindowsUpdateTables } from "./schema.service";

export function initializeRuntime() {
  loadPolicy();
  ensureInventoryTable().catch((err) => Logger.info("INVENTORY TABLE ERROR:", err));
  ensureRuntimeTables().catch((err) => Logger.info("RUNTIME TABLE ERROR:", err));
  ensureAnalyticsTables().catch((err) => Logger.info("ANALYTICS TABLE ERROR:", err));
  ensurePatchTables().catch((err) => Logger.info("PATCH TABLE ERROR:", err));
  ensureRebootTables().catch((err) => Logger.info("REBOOT TABLE ERROR:", err));
  ensureWindowsUpdateTables().catch((err) => Logger.info("WINDOWS UPDATE TABLE ERROR:", err));
  ensureUserPrivilegeTables().catch((err) => Logger.info("USER PRIVILEGE TABLE ERROR:", err));
  // RBAC seeding depends on the users table (and its role column) already
  // existing, so this must be sequenced after auth, not fired concurrently
  // like the independent ensure*Tables() calls above.
  ensureAuthTables()
    .then(() => ensureRbacTables())
    .catch((err) => Logger.info("AUTH/RBAC TABLE ERROR:", err));
  // The cloud status poller writes to cloud_services/cloud_incidents, so it
  // must wait for those tables to exist rather than firing concurrently.
  // dependency_* tables FK-reference applications(id), so they must also
  // wait for ensureApplicationTables() rather than firing concurrently.
  ensureApplicationTables()
    .then(() => Promise.all([startCloudStatusPoller(), ensureDependencyTables()]))
    .catch((err) => Logger.info("APPLICATION TABLE ERROR:", err));
  startPresenceMonitor();
  startAggregationJobs();
  startRetentionJob();
}
