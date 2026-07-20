import crypto from "crypto";
import jwt from "jsonwebtoken";
import { env } from "../config/env";

export interface AccessTokenPayload {
  userId: number;
  email: string;
  username: string;
}

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, env.jwtSecret, { expiresIn: `${env.accessTokenTtlMinutes}m` });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, env.jwtSecret) as AccessTokenPayload & jwt.JwtPayload;
}

export function generateRefreshToken(): string {
  return crypto.randomBytes(48).toString("hex");
}

export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function refreshTokenExpiryMs(rememberMe: boolean, now = Date.now()): number {
  const days = rememberMe ? env.refreshTokenTtlDaysRemembered : env.refreshTokenTtlDays;
  return now + days * 24 * 60 * 60 * 1000;
}

export function accessTokenMaxAgeMs(): number {
  return env.accessTokenTtlMinutes * 60 * 1000;
}
