"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const policies_controller_1 = require("../controllers/policies.controller");
const router = (0, express_1.Router)();
router.get("/policies", policies_controller_1.getPolicies);
router.post("/policies", policies_controller_1.savePolicies);
exports.default = router;
