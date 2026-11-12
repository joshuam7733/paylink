import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
  test: {
    environment: "node",
    include: ["tests/unit/**/*.test.ts"],
    globalSetup: ["tests/unit/global-setup.ts"],
    // One SQLite file is shared by all test files, so run them one after another.
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 120_000,
    env: {
      DATABASE_URL: "file:./test/unit.db",
      APP_URL: "http://localhost:3000",
      PAYMENTS_MODE: "demo",
      SESSION_TTL_DAYS: "7",
    },
  },
});
