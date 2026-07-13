import { Router } from "express";
import { getPolicies, savePolicies } from "../controllers/policyController";

const router = Router();

router.get("/policies", getPolicies);
router.post("/policies", savePolicies);

export default router;
