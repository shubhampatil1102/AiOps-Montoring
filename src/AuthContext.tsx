import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { postLogin, postLogout, postRefresh, type AuthSession, type AuthUser, type PermissionMap } from "@/api/auth";

interface AuthContextValue {
  user: AuthUser | null;
  accessToken: string | null;
  permissions: PermissionMap | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (identifier: string, password: string, rememberMe: boolean) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// Refresh the access token this long before it actually expires, so a
// scheduled refresh always lands before the token goes stale.
const REFRESH_BUFFER_MS = 60 * 1000;
const RETRY_DELAY_MS = 5000;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [permissions, setPermissions] = useState<PermissionMap | null>(null);
  const [loading, setLoading] = useState(true);
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function clearScheduledRefresh() {
    if (refreshTimer.current) {
      clearTimeout(refreshTimer.current);
      refreshTimer.current = null;
    }
  }

  function applySession(session: AuthSession) {
    setUser(session.user);
    setAccessToken(session.accessToken);
    setPermissions(session.permissions);
    scheduleAutoRefresh(session.accessTokenMaxAgeMs);
  }

  function clearSession() {
    setUser(null);
    setAccessToken(null);
    setPermissions(null);
    clearScheduledRefresh();
  }

  function scheduleAutoRefresh(maxAgeMs: number) {
    clearScheduledRefresh();
    const delay = Math.max(5000, maxAgeMs - REFRESH_BUFFER_MS);
    refreshTimer.current = setTimeout(() => {
      void runScheduledRefresh();
    }, delay);
  }

  // Automatic, silent refresh before the access token expires — retries
  // once on a network-level failure before giving up (a definitive 401
  // from the server, meaning the session is genuinely gone, clears
  // immediately without retrying).
  async function runScheduledRefresh(isRetry = false) {
    try {
      const session = await postRefresh();

      if (!session) {
        clearSession();
        return;
      }

      applySession(session);
    } catch {
      if (!isRetry) {
        refreshTimer.current = setTimeout(() => void runScheduledRefresh(true), RETRY_DELAY_MS);
        return;
      }

      clearSession();
    }
  }

  async function refresh(): Promise<boolean> {
    try {
      const session = await postRefresh();

      if (!session) {
        clearSession();
        return false;
      }

      applySession(session);
      return true;
    } catch {
      clearSession();
      return false;
    }
  }

  useEffect(() => {
    // Silently restore a session from the httpOnly refresh cookie on load —
    // this is what makes login persist across a page reload without ever
    // touching localStorage.
    refresh().finally(() => setLoading(false));

    return clearScheduledRefresh;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function login(identifier: string, password: string, rememberMe: boolean) {
    const session = await postLogin(identifier, password, rememberMe);
    applySession(session);
  }

  async function logout() {
    await postLogout();
    clearSession();
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        accessToken,
        permissions,
        isAuthenticated: Boolean(user),
        loading,
        login,
        logout,
        refresh,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}
