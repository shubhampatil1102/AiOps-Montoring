"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const server_1 = require("./config/server");
const app_middleware_1 = require("./middleware/app.middleware");
const error_middleware_1 = require("./middleware/error.middleware");
const routes_1 = require("./routes");
const logger_service_1 = require("./services/logger.service");
const startup_service_1 = require("./services/startup.service");
const app = (0, express_1.default)();
(0, app_middleware_1.configureMiddleware)(app);
(0, routes_1.registerRoutes)(app);
app.use(error_middleware_1.errorMiddleware);
(0, startup_service_1.initializeRuntime)();
app.listen(server_1.SERVER_PORT, () => logger_service_1.Logger.info(`Collector running on http://localhost:${server_1.SERVER_PORT}`));
