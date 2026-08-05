import { Router } from "express";
import { getCloudIncidentsList, getCloudStatusList } from "../controllers/cloud.controller";

const router = Router();

router.get("/cloud/status", getCloudStatusList);
router.get("/cloud/incidents", getCloudIncidentsList);

export default router;
