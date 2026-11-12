import { defineConfig } from "@playwright/test";

const PORT = 3100;
const BASE = `http://localhost:${PORT}`;

// End-to-end tests run against a production build with their own database (prisma/test/e2e.db),
// so they never touch your development data. They use the installed Microsoft Edge.
export const E2E_ENV = {
  DATABASE_URL: "file:./test/e2e.db",
  APP_URL: BASE,
  PAYMENTS_MODE: "demo",
  SESSION_TTL_DAYS: "7",
  SEED_ADMIN_EMAIL: "admin@paylink.test",
  SEED_ADMIN_PASSWORD: "E2E-Admin-Pass-2026",
  ENABLE_DEV_OUTBOX: "true",
};

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: BASE,
    channel: process.env.PW_CHANNEL ?? "msedge",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: `node tests/e2e/prepare.mjs && npx next build && npx next start -p ${PORT}`,
    url: `${BASE}/login`,
    timeout: 900_000,
    reuseExistingServer: false,
    env: E2E_ENV,
    stdout: "pipe",
    stderr: "pipe",
  },
});
