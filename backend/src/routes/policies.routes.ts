import { Router } from "express";
import { getPolicies, savePolicies } from "../controllers/policies.controller";

const router = Router();

router.get("/policies", getPolicies);
router.post("/policies", savePolicies);

export default router;
