import { Router } from "express";
import {
  approveSuggestion,
  getHealTimeline,
  getSuggestions,
  rejectSuggestion,
} from "../controllers/healController";

const router = Router();

router.get("/heal/suggestions", getSuggestions);
router.post("/heal/approve/:id", approveSuggestion);
router.post("/heal/reject/:id", rejectSuggestion);
router.get("/heal/timeline", getHealTimeline);

export default router;
