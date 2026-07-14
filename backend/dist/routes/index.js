"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerRoutes = registerRoutes;
const alerts_routes_1 = __importDefault(require("./alerts.routes"));
const devices_routes_1 = __importDefault(require("./devices.routes"));
const docs_routes_1 = require("./docs.routes");
const heal_routes_1 = __importDefault(require("./heal.routes"));
const health_routes_1 = __importDefault(require("./health.routes"));
const inventory_routes_1 = __importDefault(require("./inventory.routes"));
const issues_routes_1 = __importDefault(require("./issues.routes"));
const metrics_routes_1 = __importDefault(require("./metrics.routes"));
const policies_routes_1 = __importDefault(require("./policies.routes"));
const scripts_routes_1 = __importDefault(require("./scripts.routes"));
const openapi_service_1 = require("../services/openapi.service");
function registerRoutes(app) {
    app.use(metrics_routes_1.default);
    app.use(heal_routes_1.default);
    app.use(issues_routes_1.default);
    app.use(health_routes_1.default);
    app.use(alerts_routes_1.default);
    app.use(devices_routes_1.default);
    app.use(inventory_routes_1.default);
    app.use(policies_routes_1.default);
    app.use(scripts_routes_1.default);
    const openApiDocument = (0, openapi_service_1.generateOpenApiDocument)(app);
    app.use((0, docs_routes_1.createDocsRoutes)(openApiDocument));
}
