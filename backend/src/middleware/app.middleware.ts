import cookieParser from "cookie-parser";
import cors from "cors";
import express, { Express } from "express";
import { env } from "../config/env";

// RFC1918 private-LAN ranges only — never matches a public IP, so this
// can't be used to bypass CORS from the open internet.
const PRIVATE_LAN_HOSTNAME = /^(10(?:\.\d{1,3}){3}|172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2}|192\.168(?:\.\d{1,3}){2})$/;

function isAllowedOrigin(origin: string | undefined): boolean {
  if (!origin) return true; // non-browser clients (curl, the PowerShell agent) send no Origin header

  if (env.corsOriginList.includes(origin)) return true;

  if (env.corsAllowLan) {
    try {
      const hostname = new URL(origin).hostname;
      if (PRIVATE_LAN_HOSTNAME.test(hostname)) return true;
    } catch {
      return false;
    }
  }

  return false;
}

export function configureMiddleware(app: Express) {
  app.use(
    cors({
      origin: (origin, callback) => callback(null, isAllowedOrigin(origin)),
      credentials: true,
    })
  );
  app.use(cookieParser());
  // Default express.json() limit is 100kb — too small for a device's full
  // installed-software inventory (registry + AppX + winget can easily be
  // several hundred KB on a real machine). Matches the urlencoded limit below.
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
}
