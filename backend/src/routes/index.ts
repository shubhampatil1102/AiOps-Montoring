import { Express } from "express";
import alertsRoutes from "./alerts.routes";
import devicesRoutes from "./devices.routes";
import { createDocsRoutes } from "./docs.routes";
import healRoutes from "./healRoutes";
import healthRoutes from "./healthRoutes";
import inventoryRoutes from "./inventory.routes";
import issueRoutes from "./issueRoutes";
import metricsRoutes from "./metricsRoutes";
import policiesRoutes from "./policies.routes";
import scriptsRoutes from "./scripts.routes";
import { generateOpenApiDocument } from "../services/openapi.service";

export function registerRoutes(app: Express) {
  app.use(metricsRoutes);
  app.use(healRoutes);
  app.use(issueRoutes);
  app.use(healthRoutes);
  app.use(alertsRoutes);
  app.use(devicesRoutes);
  app.use(inventoryRoutes);
  app.use(policiesRoutes);
  app.use(scriptsRoutes);

  const openApiDocument = generateOpenApiDocument(app);
  app.use(createDocsRoutes(openApiDocument));
}
