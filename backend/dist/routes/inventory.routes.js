"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const inventory_controller_1 = require("../controllers/inventory.controller");
const router = (0, express_1.Router)();
router.get("/devices/:id/inventory", inventory_controller_1.getDeviceInventory);
exports.default = router;
