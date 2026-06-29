import { test, expect } from "@playwright/test";

/**
 * 核心流程 E2E：登入與帳號審核守門。
 * 需先啟動完整環境（DB + seed + dev server）。
 */
test.describe("認證流程", () => {
  test("未登入訪問後台會導向登入頁", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);
  });

  test("負責人可登入並看到儀表板", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill("owner@chun.local");
    await page.getByLabel("密碼").fill("Password123");
    await page.getByRole("button", { name: "登入" }).click();
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByRole("heading", { name: "儀表板" })).toBeVisible();
  });

  test("錯誤密碼無法登入", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill("owner@chun.local");
    await page.getByLabel("密碼").fill("wrong-password");
    await page.getByRole("button", { name: "登入" }).click();
    await expect(page.getByText(/登入失敗/)).toBeVisible();
  });
});
