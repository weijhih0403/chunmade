/**
 * TSPL (TSC TDP-225) 指令產生器。
 * 產生的字串會交由本機列印代理程式（Print Agent）送往 USB 標籤機。
 * 預設標籤尺寸 40mm x 30mm，可依需求調整。
 */

export type LabelSize = { widthMm: number; heightMm: number; gapMm: number };

const DEFAULT_SIZE: LabelSize = { widthMm: 40, heightMm: 30, gapMm: 2 };

function esc(text: string): string {
  return text.replace(/"/g, "'");
}

function header(size: LabelSize): string[] {
  return [
    `SIZE ${size.widthMm} mm, ${size.heightMm} mm`,
    `GAP ${size.gapMm} mm, 0 mm`,
    "DIRECTION 1",
    "CLS",
  ];
}

/** 商品/效期標籤：品名、批號、製造日、有效日期 */
export function buildItemLabel(params: {
  name: string;
  lotNo?: string | null;
  manufacturedAt?: string | null;
  expiresAt?: string | null;
  price?: number | null;
  copies?: number;
  size?: LabelSize;
}): string {
  const size = params.size ?? DEFAULT_SIZE;
  const lines = header(size);
  lines.push(`TEXT 16,16,"3",0,1,1,"${esc(params.name)}"`);
  let y = 56;
  if (params.lotNo) {
    lines.push(`TEXT 16,${y},"2",0,1,1,"批號:${esc(params.lotNo)}"`);
    y += 28;
  }
  if (params.manufacturedAt) {
    lines.push(`TEXT 16,${y},"2",0,1,1,"製:${esc(params.manufacturedAt)}"`);
    y += 28;
  }
  if (params.expiresAt) {
    lines.push(`TEXT 16,${y},"2",0,1,1,"效:${esc(params.expiresAt)}"`);
    y += 28;
  }
  if (params.price != null) {
    lines.push(`TEXT 16,${y},"3",0,1,1,"NT$${params.price}"`);
  }
  lines.push(`PRINT ${params.copies ?? 1},1`);
  return lines.join("\n");
}

/** 取餐號 / 簡易出單標籤 */
export function buildPickupLabel(params: {
  storeName: string;
  orderNo: string;
  pickupNo?: string | null;
  items: { name: string; quantity: number }[];
  copies?: number;
  size?: LabelSize;
}): string {
  const size = params.size ?? { widthMm: 58, heightMm: 40, gapMm: 2 };
  const lines = header(size);
  lines.push(`TEXT 16,16,"3",0,1,1,"${esc(params.storeName)}"`);
  lines.push(`TEXT 16,52,"2",0,1,1,"單號:${esc(params.orderNo)}"`);
  if (params.pickupNo) {
    lines.push(`TEXT 16,84,"4",0,1,1,"取餐號 ${esc(params.pickupNo)}"`);
  }
  let y = 140;
  for (const it of params.items.slice(0, 8)) {
    lines.push(`TEXT 16,${y},"2",0,1,1,"${esc(it.name)} x${it.quantity}"`);
    y += 28;
  }
  lines.push(`PRINT ${params.copies ?? 1},1`);
  return lines.join("\n");
}
