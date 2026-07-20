import bcrypt from "bcryptjs";
import { RBAC_MODULES, type PermissionMap } from "../constants/rbac";
import { HttpError } from "../middleware/error.middleware";
import * as refreshTokenRepository from "../repositories/refreshToken.repository";
import * as rolePermissionRepository from "../repositories/rolePermission.repository";
import * as userRepository from "../repositories/user.repository";
import {
  generateRefreshToken,
  hashToken,
  refreshTokenExpiryMs,
  signAccessToken,
} from "./token.service";

interface UserRow {
  id: number;
  email: string;
  username: string;
  password_hash: string;
  display_name: string | null;
  role: string;
  last_login_at: number | string | null;
}

function toPublicUser(user: UserRow) {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    displayName: user.display_name,
    role: user.role,
    lastLoginAt: user.last_login_at === null ? null : Number(user.last_login_at),
  };
}

/** Resolves a role's positive grants into the full module→action map the
 * frontend's usePermissions() consumes — one shared shape for every
 * consumer instead of each caller re-deriving it from raw grant rows. */
export async function resolvePermissions(role: string): Promise<PermissionMap> {
  const result = await rolePermissionRepository.findGrantsForRole(role);
  const granted = new Set(result.rows.map((r: { module: string; action: string }) => `${r.module}:${r.action}`));

  const permissions = {} as PermissionMap;
  for (const m of RBAC_MODULES) {
    permissions[m] = {
      view: granted.has(`${m}:view`),
      create: granted.has(`${m}:create`),
      edit: granted.has(`${m}:edit`),
      delete: granted.has(`${m}:delete`),
      execute: granted.has(`${m}:execute`),
    };
  }
  return permissions;
}

const INVALID_CREDENTIALS_RESPONSE = { message: "Invalid email/username or password" };
const SESSION_EXPIRED_RESPONSE = { message: "Session expired, please log in again" };

export async function login(identifier: string, password: string, rememberMe: boolean) {
  const result = await userRepository.findByEmailOrUsername(identifier);
  const user: UserRow | undefined = result.rows[0];

  if (!user) {
    throw new HttpError(401, INVALID_CREDENTIALS_RESPONSE, `Login failed: no user for "${identifier}"`);
  }

  const passwordMatches = await bcrypt.compare(password, user.password_hash);
  if (!passwordMatches) {
    throw new HttpError(401, INVALID_CREDENTIALS_RESPONSE, `Login failed: bad password for "${identifier}"`);
  }

  const now = Date.now();
  await userRepository.touchLastLogin(user.id, now);

  const accessToken = signAccessToken({ userId: user.id, email: user.email, username: user.username });
  const refreshToken = generateRefreshToken();
  const refreshTokenExpiresAt = refreshTokenExpiryMs(rememberMe, now);
  await refreshTokenRepository.insert(user.id, hashToken(refreshToken), now, refreshTokenExpiresAt);
  const permissions = await resolvePermissions(user.role);

  return { accessToken, refreshToken, refreshTokenExpiresAt, user: toPublicUser(user), permissions };
}

export async function refresh(refreshToken: string | undefined) {
  if (!refreshToken) {
    throw new HttpError(401, SESSION_EXPIRED_RESPONSE, "Refresh failed: no cookie present");
  }

  const tokenHash = hashToken(refreshToken);
  const now = Date.now();
  const result = await refreshTokenRepository.findValidByHash(tokenHash, now);
  const row = result.rows[0];

  if (!row) {
    throw new HttpError(401, SESSION_EXPIRED_RESPONSE, "Refresh failed: token invalid, expired, or revoked");
  }

  // Rotate on every use: revoke the token that was just presented, issue a
  // new one with the same remaining session length — prevents replay of a
  // stolen refresh token once the legitimate client rotates past it.
  await refreshTokenRepository.revokeByHash(tokenHash, now);

  const userResult = await userRepository.findById(Number(row.user_id));
  const user: UserRow | undefined = userResult.rows[0];
  if (!user) {
    throw new HttpError(401, SESSION_EXPIRED_RESPONSE, "Refresh failed: user no longer exists");
  }

  const sessionDurationMs = Number(row.expires_at) - Number(row.created_at);
  const newRefreshToken = generateRefreshToken();
  const newExpiresAt = now + sessionDurationMs;
  await refreshTokenRepository.insert(user.id, hashToken(newRefreshToken), now, newExpiresAt);

  const accessToken = signAccessToken({ userId: user.id, email: user.email, username: user.username });
  const permissions = await resolvePermissions(user.role);

  return {
    accessToken,
    refreshToken: newRefreshToken,
    refreshTokenExpiresAt: newExpiresAt,
    user: toPublicUser(user),
    permissions,
  };
}

export async function logout(refreshToken: string | undefined) {
  if (refreshToken) {
    await refreshTokenRepository.revokeByHash(hashToken(refreshToken), Date.now());
  }
}

export async function me(userId: number) {
  const result = await userRepository.findById(userId);
  const user: UserRow | undefined = result.rows[0];

  if (!user) {
    throw new HttpError(401, SESSION_EXPIRED_RESPONSE, `Me failed: user ${userId} no longer exists`);
  }

  const permissions = await resolvePermissions(user.role);
  return { user: toPublicUser(user), permissions };
}
