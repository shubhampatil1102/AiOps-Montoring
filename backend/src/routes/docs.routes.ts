import { Router } from "express";
import {
  createOpenApiJsonHandler,
  createSwaggerUiHandler,
} from "../controllers/docs.controller";

export function createDocsRoutes(openApiDocument: unknown) {
  const router = Router();
  const swaggerUiHandler = createSwaggerUiHandler();

  router.get("/openapi.json", createOpenApiJsonHandler(openApiDocument));
  router.get("/api-docs", swaggerUiHandler);
  router.get("/api-docs/", swaggerUiHandler);

  return router;
}
