/**
 * 以 iPhone 尺寸開啟可操作的瀏覽器預覽（需先 npm run dev）。
 *
 * 用法：
 *   npm run dev          # 終端機 1
 *   npm run mobile:preview   # 終端機 2
 *
 * 環境變數：
 *   MOBILE_BASE=http://localhost:3000
 *   MOBILE_DEVICE=iPhone 13
 *   MOBILE_AUTO_LOGIN=0   # 設為 0 可略過自動登入
 */
import { chromium, devices } from "@playwright/test";

const BASE = process.env.MOBILE_BASE || "http://localhost:3000";
const DEVICE = process.env.MOBILE_DEVICE || "iPhone 13";
const AUTO_LOGIN = process.env.MOBILE_AUTO_LOGIN !== "0";

const device = devices[DEVICE];
if (!device) {
  console.error(`找不到裝置設定：${DEVICE}`);
  console.error("可用範例：iPhone 13、iPhone SE、Pixel 7、Galaxy S9+");
  process.exit(1);
}

console.log(`\n📱 手機預覽：${DEVICE}`);
console.log(`   網址：${BASE}`);
console.log("   關閉瀏覽器視窗即可結束\n");

const browser = await chromium.launch({ headless: false });
const context = await browser.newContext({ ...device });
const page = await context.newPage();
page.setDefaultTimeout(60_000);

try {
  await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });

  if (AUTO_LOGIN) {
    const email = page.locator("#email");
    if (await email.isVisible().catch(() => false)) {
      await email.fill("owner@chun.local");
      await page.fill("#password", "Password123");
      await page.click('button[type="submit"]');
      await page.waitForURL((url) => url.pathname.startsWith("/dashboard"), {
        timeout: 60_000,
      });
      console.log("✓ 已自動登入（owner@chun.local）");
    }
  }
} catch (err) {
  console.warn("⚠ 無法自動登入，請在瀏覽器內手動登入。", err instanceof Error ? err.message : err);
}

browser.on("disconnected", () => process.exit(0));

// 保持程序運行，直到使用者關閉瀏覽器
await new Promise(() => {});
