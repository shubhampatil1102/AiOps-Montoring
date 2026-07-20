import { Router } from "express";
import {
  getDeviceReboot,
  getDeviceRebootHistory,
  getRebootDashboard,
  postDeviceReboot,
} from "../controllers/reboot.controller";

const router = Router();

router.get("/devices/reboot/dashboard", getRebootDashboard);
router.get("/devices/:id/reboot/history", getDeviceRebootHistory);
router.get("/devices/:id/reboot", getDeviceReboot);
router.post("/devices/:id/reboot", postDeviceReboot);

export default router;
