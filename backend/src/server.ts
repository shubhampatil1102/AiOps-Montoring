import express from "express";
import { SERVER_PORT } from "./config/server";
import { configureMiddleware } from "./middleware/app.middleware";
import { errorMiddleware } from "./middleware/error.middleware";
import { registerRoutes } from "./routes";
import { Logger } from "./services/logger.service";
import { initializeRuntime } from "./services/startup.service";

const app = express();

configureMiddleware(app);
registerRoutes(app);
app.use(errorMiddleware);
initializeRuntime();

app.listen(SERVER_PORT, () =>
  Logger.info(`Collector running on http://localhost:${SERVER_PORT}`)
);
