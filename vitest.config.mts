import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// Node-environment unit tests for the pure, security-critical domain logic
// (access rules, nav slots, formatting). The `@/` alias mirrors tsconfig so
// tests import modules exactly as the app does.
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL(".", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["**/*.test.ts"],
    exclude: ["node_modules/**", ".next/**"],
  },
});
