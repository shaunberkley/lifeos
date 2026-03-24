import { defineConfig } from "@playwright/test";

export default defineConfig({
  forbidOnly: Boolean(process.env.CI),
  fullyParallel: false,
  reporter: "list",
  retries: 0,
  testDir: "./apps/web/e2e",
  workers: 1,
  use: {
    baseURL: "http://127.0.0.1:4173",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    video: "retain-on-failure"
  },
  webServer: {
    command: "pnpm --filter @lifeos/web build && pnpm --filter @lifeos/web preview",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: !process.env.CI
  }
});
