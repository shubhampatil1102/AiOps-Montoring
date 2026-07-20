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
  corsOrigin: process.env.CORS_ORIGIN || "http://localhost:5173",
};
