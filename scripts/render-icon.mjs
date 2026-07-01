import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";

mkdirSync("mobile-shots", { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 200, height: 120 } });
await page.setContent(
  `<body style="margin:0;display:flex;align-items:center;background:#f3f4f6;padding:16px">
    <img src="public/brand-logo.png" alt="icon" style="height:64px;width:auto" />
  </body>`,
);
await page.waitForTimeout(200);
await page.screenshot({ path: "mobile-shots/icon-preview.png" });
await browser.close();
console.log("done");
