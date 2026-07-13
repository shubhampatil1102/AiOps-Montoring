import { Router } from "express";
import { getDeviceInventory } from "../controllers/inventory.controller";

const router = Router();

router.get("/devices/:id/inventory", getDeviceInventory);

export default router;
