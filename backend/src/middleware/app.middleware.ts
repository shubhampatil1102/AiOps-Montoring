import cookieParser from "cookie-parser";
import cors from "cors";
import express, { Express } from "express";
import { env } from "../config/env";

export function configureMiddleware(app: Express) {
  app.use(cors({ origin: env.corsOrigin, credentials: true }));
  app.use(cookieParser());
  app.use(express.json());
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
}
