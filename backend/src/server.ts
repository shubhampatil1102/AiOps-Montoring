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

// Binding 0.0.0.0 (not just localhost/127.0.0.1) is what makes this
// reachable from other machines on the LAN — required for the agent to
// connect from a different Windows machine than the one running the backend.
app.listen(SERVER_PORT, "0.0.0.0", () => {
  Logger.info(`Collector listening on 0.0.0.0:${SERVER_PORT} (reachable at http://localhost:${SERVER_PORT} locally, or http://<this-machine's-LAN-IP>:${SERVER_PORT} from other devices)`);
});
