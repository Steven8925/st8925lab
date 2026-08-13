import path from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const here = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  /**
   * Load .env from the repository root, not from apps/web.
   *
   * This project keeps a single root .env shared by all three services. Without
   * this, Vite looks only in apps/web, finds nothing, and every VITE_* variable
   * silently falls back to its default - so changing a port in .env would move
   * the API while the console kept calling the old one, with no error anywhere.
   */
  envDir: path.resolve(here, "../.."),
  resolve: {
    alias: {
      // Consume the contracts package from source. The simulation console and
      // the API must never drift on enum values or wire shapes.
      "@alarm/contracts": path.resolve(here, "../../packages/contracts/src/index.ts"),
    },
  },
  server: {
    port: 5173,
    strictPort: true,
  },
});
