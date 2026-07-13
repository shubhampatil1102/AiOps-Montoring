"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const alerts_controller_1 = require("../controllers/alerts.controller");
const router = (0, express_1.Router)();
router.get("/alerts", alerts_controller_1.getAlerts);
router.post("/alerts/:time/ack", alerts_controller_1.acknowledgeAlert);
exports.default = router;
