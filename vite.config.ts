import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: {
    // Binds 0.0.0.0 instead of only localhost — without this, "npm run dev"
    // is unreachable from other machines on the LAN no matter how VITE_API_URL
    // or the backend's own binding are configured. localhost:5173 still works
    // exactly as before.
    host: true,
  },
});
