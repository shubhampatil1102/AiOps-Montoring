// CORS_ORIGIN accepts a comma-separated list so the same backend can serve
// both a local dev frontend and one opened from a LAN IP, e.g.:
//   CORS_ORIGIN=http://localhost:5173,http://192.168.1.50:5173
const corsOriginList = (process.env.CORS_ORIGIN || "http://localhost:5173,http://127.0.0.1:5173")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

export const env = {
  dbHost: process.env.DB_HOST || "localhost",
  dbPort: process.env.DB_PORT || "5432",
  dbUser: process.env.DB_USER || "postgres",
  dbPassword: process.env.DB_PASSWORD || "admin",
  dbName: process.env.DB_NAME || "aiops",
  jwtSecret: process.env.JWT_SECRET || "dev-only-insecure-jwt-secret-change-me",
  accessTokenTtlMinutes: Number(process.env.ACCESS_TOKEN_TTL_MINUTES) || 15,
  refreshTokenTtlDays: Number(process.env.REFRESH_TOKEN_TTL_DAYS) || 7,
  refreshTokenTtlDaysRemembered: Number(process.env.REFRESH_TOKEN_TTL_DAYS_REMEMBERED) || 30,
  corsOriginList,
  // Explicitly opt-in, off by default — allows any http(s)://<private-LAN-IP>:<port>
  // origin (10.x, 172.16-31.x, 192.168.x) in addition to corsOriginList, so
  // admins on the LAN can open the dev frontend from its LAN IP without
  // having to enumerate every possible IP in CORS_ORIGIN. Never allows
  // public internet origins.
  corsAllowLan: (process.env.CORS_ALLOW_LAN ?? "true").toLowerCase() !== "false",
};
