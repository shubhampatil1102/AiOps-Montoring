import { Router } from "express";
import { testRoute } from "../controllers/healthController";

const router = Router();

router.get("/test-route", testRoute);

export default router;
