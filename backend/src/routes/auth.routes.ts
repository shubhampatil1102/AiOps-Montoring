import { Router } from "express";
import { login, logout, me, permissions, refresh } from "../controllers/auth.controller";
import { requireAuth } from "../middleware/auth.middleware";

const router = Router();

router.post("/auth/login", login);
router.post("/auth/logout", logout);
router.post("/auth/refresh", refresh);
router.get("/auth/me", requireAuth, me);
router.get("/auth/permissions", requireAuth, permissions);

export default router;
