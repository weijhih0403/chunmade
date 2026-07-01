/** 將簽名圖片裁切、放大、二值化，提升 OCR 辨識率 */

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = dataUrl;
  });
}

function getStrokeBounds(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const { data } = ctx.getImageData(0, 0, w, h);
  let minX = w;
  let minY = h;
  let maxX = 0;
  let maxY = 0;
  let found = false;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const lum = 0.299 * data[i]! + 0.587 * data[i + 1]! + 0.114 * data[i + 2]!;
      if (lum < 240) {
        found = true;
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (!found) return { x: 0, y: 0, w, h };
  const pad = Math.max(8, Math.round(Math.min(w, h) * 0.04));
  const x = Math.max(0, minX - pad);
  const y = Math.max(0, minY - pad);
  return {
    x,
    y,
    w: Math.min(w - x, maxX - minX + 1 + pad * 2),
    h: Math.min(h - y, maxY - minY + 1 + pad * 2),
  };
}

export async function preprocessSignatureForOcr(dataUrl: string): Promise<string> {
  const img = await loadImage(dataUrl);
  const src = document.createElement("canvas");
  src.width = img.width;
  src.height = img.height;
  const sctx = src.getContext("2d")!;
  sctx.fillStyle = "#ffffff";
  sctx.fillRect(0, 0, src.width, src.height);
  sctx.drawImage(img, 0, 0);

  const bounds = getStrokeBounds(sctx, src.width, src.height);
  const targetW = Math.max(320, Math.min(800, bounds.w * 3));
  const scale = targetW / bounds.w;
  const targetH = Math.round(bounds.h * scale);

  const out = document.createElement("canvas");
  out.width = targetW;
  out.height = targetH;
  const octx = out.getContext("2d")!;
  octx.fillStyle = "#ffffff";
  octx.fillRect(0, 0, targetW, targetH);
  octx.drawImage(src, bounds.x, bounds.y, bounds.w, bounds.h, 0, 0, targetW, targetH);

  const { data } = octx.getImageData(0, 0, targetW, targetH);
  for (let i = 0; i < data.length; i += 4) {
    const lum = 0.299 * data[i]! + 0.587 * data[i + 1]! + 0.114 * data[i + 2]!;
    const v = lum < 160 ? 0 : 255;
    data[i] = v;
    data[i + 1] = v;
    data[i + 2] = v;
  }
  octx.putImageData(new ImageData(data, targetW, targetH), 0, 0);

  return out.toDataURL("image/png");
}
