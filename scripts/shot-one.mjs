import { chromium, devices } from "@playwright/test";
import { mkdirSync } from "node:fs";

const BASE = process.env.SHOT_BASE || "http://localhost:3000";
const PATH = process.env.SHOT_PATH || "/dashboard/items";
const NAME = process.env.SHOT_NAME || "one";
const OUT = "mobile-shots";
mkdirSync(OUT, { recursive: true });

const iPhone = devices["iPhone 13"];
const browser = await chromium.launch();
const ctx = await browser.newContext(
  process.env.SHOT_DEVICE === "desktop"
    ? { viewport: { width: 1280, height: 800 } }
    : { ...iPhone },
);
const page = await ctx.newPage();
page.setDefaultTimeout(120000);

await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
await page.fill("#email", "owner@chun.local");
await page.fill("#password", "Password123");
await page.click('button[type="submit"]');
await page.waitForURL((url) => url.pathname.startsWith("/dashboard"), { timeout: 120000 });

// 第一次導頁讓 dev 編譯，reload 後 CSS 才會穩定套用
await page.goto(`${BASE}${PATH}`, { waitUntil: "networkidle" });
await page.waitForTimeout(800);
await page.reload({ waitUntil: "networkidle" });
await page.waitForTimeout(800);
if (process.env.SHOT_CLICK) {
  await page.click(process.env.SHOT_CLICK);
  await page.waitForTimeout(500);
}
await page.screenshot({ path: `${OUT}/${NAME}.png`, fullPage: true });
console.log("captured", NAME);

await browser.close();
