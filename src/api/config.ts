const envUrl = import.meta.env.VITE_API_URL?.trim();

export const API_URL =
  envUrl ||
  (import.meta.env.DEV ? "http://localhost:4000" : "/api");
