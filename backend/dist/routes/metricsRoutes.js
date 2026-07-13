"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const metricsController_1 = require("../controllers/metricsController");
const router = (0, express_1.Router)();
router.post("/metrics", metricsController_1.postMetrics);
exports.default = router;
