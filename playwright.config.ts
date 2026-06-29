import { defineConfig, devices } from "@playwright/test";

/**
 * E2E 測試設定。執行前需先啟動資料庫與 dev server：
 *   npm run docker:up && npm run db:push && npm run db:seed && npm run dev
 * 然後：npm run test:e2e
 */
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: "list",
  use: {
    baseURL: process.env.E2E_BASE_URL || "http://localhost:3000",
    trace: "on-first-retry",
    locale: "zh-TW",
    timezoneId: "Asia/Taipei",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
