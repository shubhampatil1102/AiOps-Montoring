"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createDocsRoutes = createDocsRoutes;
const express_1 = require("express");
const docs_controller_1 = require("../controllers/docs.controller");
function createDocsRoutes(openApiDocument) {
    const router = (0, express_1.Router)();
    const swaggerUiHandler = (0, docs_controller_1.createSwaggerUiHandler)();
    router.get("/openapi.json", (0, docs_controller_1.createOpenApiJsonHandler)(openApiDocument));
    router.get("/api-docs", swaggerUiHandler);
    router.get("/api-docs/", swaggerUiHandler);
    return router;
}
