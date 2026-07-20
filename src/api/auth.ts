import { API_URL } from "./config";

export interface AuthUser {
  id: number;
  email: string;
  username: string;
  displayName: string | null;
  role: string;
  lastLoginAt: number | null;
}

export type PermissionAction = "view" | "create" | "edit" | "delete" | "execute";
export type PermissionMap = Record<string, Record<PermissionAction, boolean>>;

export interface AuthSession {
  accessToken: string;
  accessTokenMaxAgeMs: number;
  user: AuthUser;
  permissions: PermissionMap;
}

interface ErrorBody {
  message?: string;
}

async function parseJsonOrThrow<T>(response: Response, fallbackMessage: string): Promise<T> {
  let body: T | ErrorBody | null = null;

  try {
    body = await response.json();
  } catch {
    // no/invalid JSON body
  }

  if (!response.ok) {
    const message = (body as ErrorBody | null)?.message || fallbackMessage;
    throw new Error(message);
  }

  return body as T;
}

export async function postLogin(identifier: string, password: string, rememberMe: boolean) {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ identifier, password, rememberMe }),
  });

  return parseJsonOrThrow<AuthSession>(response, "Login failed. Please try again.");
}

export async function postRefresh(): Promise<AuthSession | null> {
  const response = await fetch(`${API_URL}/auth/refresh`, {
    method: "POST",
    credentials: "include",
  });

  if (response.status === 401) {
    return null;
  }

  return parseJsonOrThrow<AuthSession>(response, "Unable to restore your session.");
}

export async function postLogout(): Promise<void> {
  await fetch(`${API_URL}/auth/logout`, {
    method: "POST",
    credentials: "include",
  });
}

export async function getMe(accessToken: string) {
  const response = await fetch(`${API_URL}/auth/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  return parseJsonOrThrow<{ user: AuthUser; permissions: PermissionMap }>(
    response,
    "Unable to load the current user."
  );
}
