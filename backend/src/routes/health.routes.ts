import { Router } from "express";
import { testRoute } from "../controllers/health.controller";

const router = Router();

router.get("/test-route", testRoute);

export default router;
