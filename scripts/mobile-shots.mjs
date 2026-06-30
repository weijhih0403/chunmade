import { chromium, devices } from "@playwright/test";
import { mkdirSync } from "node:fs";

const BASE = process.env.SHOT_BASE || "http://localhost:3000";
const OUT = "mobile-shots";
mkdirSync(OUT, { recursive: true });

const iPhone = devices["iPhone 13"];

const browser = await chromium.launch();
const ctx = await browser.newContext({ ...iPhone });
const page = await ctx.newPage();
page.setDefaultTimeout(60000);

// 登入
await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
await page.screenshot({ path: `${OUT}/00-login.png`, fullPage: true });
await page.fill("#email", "owner@chun.local");
await page.fill("#password", "Password123");
await page.click('button[type="submit"]');
try {
  await page.waitForURL((url) => url.pathname.startsWith("/dashboard"), {
    timeout: 120000,
  });
} catch {
  await page.screenshot({ path: `${OUT}/00-login-failed.png`, fullPage: true });
  console.log("login did not redirect, url=", page.url());
  await browser.close();
  process.exit(1);
}
await page.waitForLoadState("networkidle");

const targets = [
  ["01-dashboard", "/dashboard"],
  ["02-items", "/dashboard/items"],
  ["03-employees", "/dashboard/employees"],
  ["04-schedule", "/dashboard/schedule"],
  ["05-counts", "/dashboard/counts"],
  ["06-customers", "/dashboard/customers"],
  ["07-suppliers", "/dashboard/suppliers"],
  ["08-inventory", "/dashboard/inventory"],
];

for (const [name, path] of targets) {
  await page.goto(`${BASE}${path}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true });
  console.log("captured", name);
}

// 漢堡選單展開
await page.goto(`${BASE}/dashboard`, { waitUntil: "networkidle" });
await page.click('[aria-label="開啟選單"]');
await page.waitForTimeout(400);
await page.screenshot({ path: `${OUT}/09-menu-open.png` });
console.log("captured 09-menu-open");

await browser.close();
console.log("done");
