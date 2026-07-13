"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerRoutes = registerRoutes;
const alerts_routes_1 = __importDefault(require("./alerts.routes"));
const devices_routes_1 = __importDefault(require("./devices.routes"));
const docs_routes_1 = require("./docs.routes");
const healRoutes_1 = __importDefault(require("./healRoutes"));
const healthRoutes_1 = __importDefault(require("./healthRoutes"));
const inventory_routes_1 = __importDefault(require("./inventory.routes"));
const issueRoutes_1 = __importDefault(require("./issueRoutes"));
const metricsRoutes_1 = __importDefault(require("./metricsRoutes"));
const policies_routes_1 = __importDefault(require("./policies.routes"));
const scripts_routes_1 = __importDefault(require("./scripts.routes"));
const openapi_service_1 = require("../services/openapi.service");
function registerRoutes(app) {
    app.use(metricsRoutes_1.default);
    app.use(healRoutes_1.default);
    app.use(issueRoutes_1.default);
    app.use(healthRoutes_1.default);
    app.use(alerts_routes_1.default);
    app.use(devices_routes_1.default);
    app.use(inventory_routes_1.default);
    app.use(policies_routes_1.default);
    app.use(scripts_routes_1.default);
    const openApiDocument = (0, openapi_service_1.generateOpenApiDocument)(app);
    app.use((0, docs_routes_1.createDocsRoutes)(openApiDocument));
}
