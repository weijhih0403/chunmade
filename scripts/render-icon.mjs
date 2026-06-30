import { chromium } from "@playwright/test";
import { readFileSync, mkdirSync } from "node:fs";

const svg = readFileSync("src/app/icon.svg", "utf8");
mkdirSync("mobile-shots", { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 160, height: 160 } });
await page.setContent(
  `<body style="margin:0;display:flex;gap:16px;align-items:center;background:#f3f4f6;padding:16px">
    <div style="width:128px;height:128px">${svg}</div>
    <div style="width:32px;height:32px">${svg}</div>
  </body>`,
);
await page.waitForTimeout(200);
await page.screenshot({ path: "mobile-shots/icon-preview.png" });
await browser.close();
console.log("done");
