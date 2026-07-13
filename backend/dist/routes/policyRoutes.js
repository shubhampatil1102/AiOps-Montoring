"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const policyController_1 = require("../controllers/policyController");
const router = (0, express_1.Router)();
router.get("/policies", policyController_1.getPolicies);
router.post("/policies", policyController_1.savePolicies);
exports.default = router;
