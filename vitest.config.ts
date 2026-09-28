import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    env: {
      // Modules import the Drizzle client at load; the Pool is lazy so no
      // connection is opened during unit tests.
      DATABASE_URL: "postgresql://postgres:postgres@127.0.0.1:5432/app_db",
      APP_ENCRYPTION_KEY: "unit-test-key",
    },
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
});
