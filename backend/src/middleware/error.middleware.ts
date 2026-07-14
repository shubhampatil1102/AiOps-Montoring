import { NextFunction, Request, RequestHandler, Response } from "express";
import { Logger } from "../services/logger.service";

type ErrorResponseBody = Record<string, unknown>;

type AsyncHandlerOptions = {
  statusCode: number;
  responseBody: ErrorResponseBody;
  logMessage: string;
};

export class HttpError extends Error {
  statusCode: number;
  responseBody: ErrorResponseBody;
  logMessage?: string;
  cause?: unknown;

  constructor(
    statusCode: number,
    responseBody: ErrorResponseBody,
    logMessage?: string,
    cause?: unknown
  ) {
    super(logMessage || "Request failed");
    this.statusCode = statusCode;
    this.responseBody = responseBody;
    this.logMessage = logMessage;
    this.cause = cause;
  }
}

export function asyncHandler(
  handler: RequestHandler,
  options?: AsyncHandlerOptions
): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(handler(req, res, next)).catch((err) => {
      if (!options) {
        next(err);
        return;
      }

      next(
        new HttpError(
          options.statusCode,
          options.responseBody,
          options.logMessage,
          err
        )
      );
    });
  };
}

export function errorMiddleware(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  if (err instanceof HttpError) {
    if (err.logMessage) {
      Logger.error(err.logMessage, err.cause ?? err);
    }
    return res.status(err.statusCode).send(err.responseBody);
  }

  Logger.error("UNHANDLED ERROR:", err);
  return res.status(500).send({ error: "Internal server error" });
}
