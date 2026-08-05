import { Router } from "express";
import { getDeviceUserPrivilege, getDeviceUserPrivilegeEvents } from "../controllers/userPrivilege.controller";

const router = Router();

// Reads only — ingestion happens via the existing /metrics endpoint, same
// as every other agent-collected dataset.
router.get("/devices/:id/user-privilege", getDeviceUserPrivilege);
router.get("/devices/:id/user-privilege/events", getDeviceUserPrivilegeEvents);

export default router;
