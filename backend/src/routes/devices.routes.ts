import { Router } from "express";
import {
  getDevice,
  getDeviceCompliance,
  getDeviceEvents,
  getDeviceHardware,
  getDeviceHistory,
  getDeviceUpdates,
  getDevices,
  getDevicesHardware,
  getTopProcesses,
} from "../controllers/devices.controller";

const router = Router();

router.get("/devices", getDevices);
router.get("/devices/hardware", getDevicesHardware);
router.get("/devices/:id/compliance", getDeviceCompliance);
router.get("/devices/:id/hardware", getDeviceHardware);
router.get("/devices/:id/updates", getDeviceUpdates);
router.get("/devices/:id/history", getDeviceHistory);
router.get("/devices/:id/events", getDeviceEvents);
router.get("/devices/:id/top-processes", getTopProcesses);
router.get("/devices/:id", getDevice);

export default router;
