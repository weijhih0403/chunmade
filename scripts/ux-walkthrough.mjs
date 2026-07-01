import { chromium } from "@playwright/test";

const BASE = process.env.E2E_BASE_URL || "http://localhost:3000";

/** @typedef {{ area: string; item: string; ok: boolean; note?: string }} Check */

/** @type {Check[]} */
const checks = [];

function record(area, item, ok, note) {
  checks.push({ area, item, ok, note });
  const mark = ok ? "✓" : "✗";
  console.log(`${mark} [${area}] ${item}${note ? ` — ${note}` : ""}`);
}

const browser = await chromium.launch();
const page = await browser.newPage({ locale: "zh-TW" });
page.setDefaultTimeout(30000);

try {
  // 登入
  await page.goto(`${BASE}/login`);
  await page.fill("#email", "owner@chun.local");
  await page.fill("#password", "Password123");
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/dashboard/, { timeout: 60000 });
  record("登入", "負責人可登入進儀表板", true);

  // 側邊欄導覽
  await page.goto(`${BASE}/dashboard/materials`);
  const hasMaterials = await page.getByRole("heading", { name: "原物料" }).isVisible();
  record("導覽", "原物料頁可進入", hasMaterials);

  const hasCustomerNav = await page.locator('a[href="/dashboard/customers"]').count();
  record("導覽", "客戶/會員已從側欄移除", hasCustomerNav === 0);

  // 原物料搜尋
  await page.fill('input[name="q"]', "芋圓");
  await page.getByRole("button", { name: "搜尋" }).click();
  await page.waitForLoadState("networkidle");
  const searchWorks = (await page.locator("tbody tr").count()) > 0;
  record("原物料", "搜尋功能可用", searchWorks);

  // 原物料 → 編輯 → 回上一頁
  const editLink = page.locator('a:has-text("編輯")').first();
  if (await editLink.count()) {
    await editLink.click();
    await page.waitForLoadState("networkidle");
    const hasBack = await page.getByRole("button", { name: "回上一頁" }).isVisible();
    record("編輯頁", "原物料編輯頁有回上一頁", hasBack);
    await page.getByRole("button", { name: "回上一頁" }).click();
    await page.waitForLoadState("networkidle");
    const backToMaterials = page.url().includes("/materials");
    record("編輯頁", "回上一頁可回到原物料列表", backToMaterials);
  }

  // 新增原物料預設類型
  await page.goto(`${BASE}/dashboard/items/new?type=RAW_MATERIAL`);
  const typeSelect = page.locator('select[name="type"]');
  const defaultType = await typeSelect.inputValue().catch(() => "");
  record(
    "新增品項",
    "新增頁品項類型預設",
    defaultType === "RAW_MATERIAL",
    `目前預設=${defaultType || "SALE_ITEM"}`,
  );

  // 盤點流程
  await page.goto(`${BASE}/dashboard/counts`);
  const hasCountForm = await page.getByText("建立並開始盤點").isVisible();
  record("盤點", "可建立盤點單", hasCountForm);

  const openCount = page.locator('a:has-text("開啟")').first();
  if (await openCount.count()) {
    await openCount.click();
    await page.waitForLoadState("networkidle");
    const countBack = await page.getByRole("button", { name: "回上一頁" }).isVisible();
    record("盤點", "盤點詳情有回上一頁", countBack);
    const rowCount = await page.locator("tbody tr").count();
    record(
      "盤點",
      "盤點品項數量合理",
      rowCount < 150,
      `共 ${rowCount} 筆（含全部追蹤庫存品項）`,
    );
  }

  // 門市倉庫 → 原物料庫存
  await page.goto(`${BASE}/dashboard/org`);
  const stockLink = page.locator('a:has-text("查看原物料庫存")').first();
  if (await stockLink.count()) {
    await stockLink.click();
    await page.waitForLoadState("networkidle");
    const whBack = await page.getByRole("button", { name: "回上一頁" }).isVisible();
    record("倉庫", "倉庫庫存頁有回上一頁", whBack);
  }

  // 供應商刪除按鈕（無確認）
  await page.goto(`${BASE}/dashboard/suppliers`);
  const deleteBtn = page.locator('button:has-text("刪除")').first();
  record(
    "供應商",
    "列表有刪除功能",
    (await deleteBtn.count()) > 0,
    "無二次確認對話框",
  );

  // 員工頁
  await page.goto(`${BASE}/dashboard/employees`);
  const hasEmployeeForm = await page.getByText("新增員工").isVisible().catch(() => false);
  const hasEmployeeEdit = (await page.locator('a:has-text("編輯")').count()) > 0;
  record("員工", "可新增員工", hasEmployeeForm);
  record("員工", "可編輯員工", hasEmployeeEdit, hasEmployeeEdit ? undefined : "僅列表+新增，無編輯入口");

  // 手機版漢堡選單
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${BASE}/dashboard`);
  await page.click('[aria-label="開啟選單"]');
  const menuVisible = await page.getByRole("link", { name: "原物料" }).isVisible();
  record("手機版", "漢堡選單可開啟導覽", menuVisible);

  // 儀表板待審核連結
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(`${BASE}/dashboard`);
  const dashHeading = await page.getByRole("heading", { name: "儀表板" }).isVisible();
  record("儀表板", "首頁資訊可讀", dashHeading);
} catch (err) {
  console.error("walkthrough error:", err);
  record("系統", "流程走查", false, String(err));
} finally {
  await browser.close();
}

const failed = checks.filter((c) => !c.ok);
console.log("\n=== 摘要 ===");
console.log(`通過 ${checks.length - failed.length} / ${checks.length}`);
if (failed.length) {
  console.log("\n待改善：");
  for (const f of failed) console.log(`- [${f.area}] ${f.item}${f.note ? ` (${f.note})` : ""}`);
}
