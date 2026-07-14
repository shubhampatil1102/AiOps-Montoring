"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HttpError = void 0;
exports.asyncHandler = asyncHandler;
exports.errorMiddleware = errorMiddleware;
const logger_service_1 = require("../services/logger.service");
class HttpError extends Error {
    constructor(statusCode, responseBody, logMessage, cause) {
        super(logMessage || "Request failed");
        this.statusCode = statusCode;
        this.responseBody = responseBody;
        this.logMessage = logMessage;
        this.cause = cause;
    }
}
exports.HttpError = HttpError;
function asyncHandler(handler, options) {
    return (req, res, next) => {
        Promise.resolve(handler(req, res, next)).catch((err) => {
            if (!options) {
                next(err);
                return;
            }
            next(new HttpError(options.statusCode, options.responseBody, options.logMessage, err));
        });
    };
}
function errorMiddleware(err, _req, res, _next) {
    if (err instanceof HttpError) {
        if (err.logMessage) {
            logger_service_1.Logger.error(err.logMessage, err.cause ?? err);
        }
        return res.status(err.statusCode).send(err.responseBody);
    }
    logger_service_1.Logger.error("UNHANDLED ERROR:", err);
    return res.status(500).send({ error: "Internal server error" });
}
