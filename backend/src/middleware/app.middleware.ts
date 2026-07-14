import cors from "cors";
import express, { Express } from "express";

export function configureMiddleware(app: Express) {
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
}
