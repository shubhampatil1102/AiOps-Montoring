import { Request, Response } from "express";
import * as authService from "../services/auth.service";
import { accessTokenMaxAgeMs } from "../services/token.service";

const REFRESH_COOKIE_NAME = "refreshToken";
const REFRESH_COOKIE_PATH = "/auth";
const isProduction = process.env.NODE_ENV === "production";

function setRefreshCookie(res: Response, token: string, expiresAt: number) {
  res.cookie(REFRESH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    maxAge: Math.max(0, expiresAt - Date.now()),
    path: REFRESH_COOKIE_PATH,
  });
}

export async function login(req: Request, res: Response) {
  const { identifier, password, rememberMe } = req.body ?? {};

  const result = await authService.login(String(identifier ?? ""), String(password ?? ""), Boolean(rememberMe));

  setRefreshCookie(res, result.refreshToken, result.refreshTokenExpiresAt);

  res.send({
    accessToken: result.accessToken,
    accessTokenMaxAgeMs: accessTokenMaxAgeMs(),
    user: result.user,
    permissions: result.permissions,
  });
}

export async function refresh(req: Request, res: Response) {
  const token: string | undefined = req.cookies?.[REFRESH_COOKIE_NAME];

  const result = await authService.refresh(token);

  setRefreshCookie(res, result.refreshToken, result.refreshTokenExpiresAt);

  res.send({
    accessToken: result.accessToken,
    accessTokenMaxAgeMs: accessTokenMaxAgeMs(),
    user: result.user,
    permissions: result.permissions,
  });
}

export async function logout(req: Request, res: Response) {
  const token: string | undefined = req.cookies?.[REFRESH_COOKIE_NAME];

  await authService.logout(token);

  res.clearCookie(REFRESH_COOKIE_NAME, { path: REFRESH_COOKIE_PATH });
  res.send({ ok: true });
}

export async function me(req: Request, res: Response) {
  const result = await authService.me(req.user!.userId);
  res.send(result);
}

export async function permissions(req: Request, res: Response) {
  const result = await authService.me(req.user!.userId);
  res.send({ role: result.user.role, permissions: result.permissions });
}
