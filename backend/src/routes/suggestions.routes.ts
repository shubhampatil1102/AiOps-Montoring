import { Router } from "express";
import { getSuggestions } from "../controllers/suggestions.controller";

const router = Router();

router.get("/suggestions", getSuggestions);

export default router;