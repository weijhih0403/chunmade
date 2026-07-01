import sharp from "sharp";
import { copyFileSync } from "node:fs";

const SRC = "public/brand-logo.png";

/** 裁掉圖檔上下黑邊，並產生方形 favicon */
async function main() {
  const trimmed = await sharp(SRC).trim({ threshold: 15 }).png().toBuffer();
  const meta = await sharp(trimmed).metadata();
  if (!meta.width || !meta.height) throw new Error("無法讀取圖片尺寸");

  await sharp(trimmed).toFile("public/brand-logo.png");
  console.log(`已裁切橫幅 logo：${meta.width}×${meta.height}`);

  // 方形圖示：取左側紅圓主視覺（約為高度寬度的正方形）
  const iconSide = Math.min(meta.height, Math.round(meta.height * 1.05));
  const icon = await sharp(trimmed)
    .extract({
      left: 0,
      top: 0,
      width: Math.min(iconSide, meta.width),
      height: meta.height,
    })
    .resize(512, 512, {
      fit: "contain",
      background: { r: 255, g: 255, b: 255, alpha: 0 },
    })
    .png()
    .toBuffer();

  await sharp(icon).toFile("public/brand-icon.png");
  copyFileSync("public/brand-icon.png", "src/app/icon.png");
  copyFileSync("public/brand-icon.png", "src/app/apple-icon.png");
  console.log("已產生 public/brand-icon.png 與 favicon");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
