import { Express } from "express";
import alertsRoutes from "./alerts.routes";
import analyticsRoutes from "./analytics.routes";
import authRoutes from "./auth.routes";
import devicesRoutes from "./devices.routes";
import { createDocsRoutes } from "./docs.routes";
import healRoutes from "./heal.routes";
import healthRoutes from "./health.routes";
import inventoryRoutes from "./inventory.routes";
import issueRoutes from "./issues.routes";
import metricsRoutes from "./metrics.routes";
import patchRoutes from "./patch.routes";
import policiesRoutes from "./policies.routes";
import rebootRoutes from "./reboot.routes";
import scriptsRoutes from "./scripts.routes";
import { generateOpenApiDocument } from "../services/openapi.service";
import suggestionsRoutes from "./suggestions.routes";

export function registerRoutes(app: Express) {
  app.use(authRoutes);
  app.use(metricsRoutes);
  app.use(analyticsRoutes);
  app.use(healRoutes);
  app.use(issueRoutes);
  app.use(healthRoutes);
  app.use(alertsRoutes);
  app.use(devicesRoutes);
  app.use(inventoryRoutes);
  app.use(policiesRoutes);
  app.use(patchRoutes);
  app.use(rebootRoutes);
  app.use(scriptsRoutes);
  app.use(suggestionsRoutes);

  const openApiDocument = generateOpenApiDocument(app);
  app.use(createDocsRoutes(openApiDocument));
}
