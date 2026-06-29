import type { Prisma } from "@prisma/client";
import { businessDateKey } from "@/lib/dates";

/** 單據前綴對應 */
export const DOC_PREFIX = {
  SALES_ORDER: "SO",
  PURCHASE_ORDER: "PO",
  PURCHASE_REQUEST: "PR",
  GOODS_RECEIPT: "GR",
  PRODUCTION_ORDER: "MO",
  STOCK_TRANSFER: "TR",
  STOCK_COUNT: "SC",
  WASTE: "WS",
  REFUND: "RF",
} as const;

export type DocType = keyof typeof DOC_PREFIX;

/**
 * 產生可讀單號，例如 SO-20260629-0001。
 * 必須在 transaction 中呼叫以確保序號不重複。
 */
export async function nextDocumentNo(
  tx: Prisma.TransactionClient,
  companyId: string,
  type: DocType,
  date: Date = new Date(),
): Promise<string> {
  const prefix = DOC_PREFIX[type];
  const period = businessDateKey(date);

  const seq = await tx.sequence.upsert({
    where: { companyId_type_period: { companyId, type, period } },
    create: { companyId, type, period, lastValue: 1 },
    update: { lastValue: { increment: 1 } },
  });

  const serial = String(seq.lastValue).padStart(4, "0");
  return `${prefix}-${period}-${serial}`;
}
