import { NextFunction, Request, Response } from "express";
import type { PermissionAction } from "../constants/rbac";
import * as rolePermissionRepository from "../repositories/rolePermission.repository";
import * as userRepository from "../repositories/user.repository";
import { verifyAccessToken, type AccessTokenPayload } from "../services/token.service";
import { HttpError } from "./error.middleware";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AccessTokenPayload;
    }
  }
}

/** Verifies the Authorization: Bearer <accessToken> header and attaches the
 * decoded payload to req.user. Built as reusable infrastructure — not yet
 * applied to any existing route (see auth epic scope notes). */
export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice("Bearer ".length) : null;

  if (!token) {
    next(new HttpError(401, { message: "Not authenticated" }, "requireAuth: missing bearer token"));
    return;
  }

  try {
    req.user = verifyAccessToken(token);
    next();
  } catch (err) {
    next(new HttpError(401, { message: "Session expired, please log in again" }, "requireAuth: invalid/expired token", err));
  }
}

/** Layers a permission check on top of requireAuth (must run after it —
 * relies on req.user). Real, working infrastructure; deliberately not yet
 * applied to any existing data route (see RBAC epic scope notes) since the
 * frontend doesn't attach an Authorization header to those calls yet. */
export function requirePermission(module: string, action: PermissionAction) {
  return async function (req: Request, _res: Response, next: NextFunction) {
    if (!req.user) {
      next(new HttpError(401, { message: "Not authenticated" }, "requirePermission: requireAuth must run first"));
      return;
    }

    try {
      const userResult = await userRepository.findById(req.user.userId);
      const user = userResult.rows[0];

      if (!user) {
        next(new HttpError(401, { message: "Session expired, please log in again" }, "requirePermission: user no longer exists"));
        return;
      }

      const grants = await rolePermissionRepository.findGrantsForRole(user.role);
      const allowed = grants.rows.some((g: { module: string; action: string }) => g.module === module && g.action === action);

      if (!allowed) {
        next(
          new HttpError(
            403,
            { message: "You do not have permission to perform this action" },
            `requirePermission: role "${user.role}" lacks ${module}:${action}`
          )
        );
        return;
      }

      next();
    } catch (err) {
      next(new HttpError(500, { message: "Unable to verify permissions" }, "requirePermission: unexpected error", err));
    }
  };
}
