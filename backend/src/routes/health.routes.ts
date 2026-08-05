import { Router } from "express";
import { getHealth, testRoute } from "../controllers/health.controller";

const router = Router();

router.get("/test-route", testRoute);
router.get("/health", getHealth);

export default router;
