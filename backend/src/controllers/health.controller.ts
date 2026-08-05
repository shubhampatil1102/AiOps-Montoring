import { Request, Response } from "express";

// Kept in sync with backend/package.json's "version" field by hand — not
// imported directly since resolveJsonModule isn't enabled in tsconfig.json
// and this file is outside rootDir, so importing it would need a build
// config change unrelated to this fix.
const APP_VERSION = "1.0.0";

const startedAt = Date.now();

export function testRoute(_: Request, res: Response) {
  res.send("Working");
}

// Used by the agent's startup connectivity test and by
// Test-NexOpsConnection.ps1 — deliberately unauthenticated and
// dependency-free (no DB call) so it reports "the backend process is up
// and reachable" even if something downstream (DB, etc.) is unhealthy.
export function getHealth(_: Request, res: Response) {
  res.send({
    status: "healthy",
    version: APP_VERSION,
    uptime: Math.floor((Date.now() - startedAt) / 1000),
  });
}
