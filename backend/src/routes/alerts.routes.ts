import { Router } from "express";
import { acknowledgeAlert, getAlerts } from "../controllers/alerts.controller";

const router = Router();

router.get("/alerts", getAlerts);
router.post("/alerts/:time/ack", acknowledgeAlert);

export default router;
