import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "../..",
  testMatch: [
    "a-level/content/**/containers/**/simulation/**/*.test.ts",
    "shared/content/**/containers/**/simulation/**/*.test.ts",
    "sutd/content/**/containers/**/simulation/**/*.test.ts",
  ],
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  use: {
    baseURL: "http://127.0.0.1:4173",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "pnpm -F @paideia/sim-harness dev",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
