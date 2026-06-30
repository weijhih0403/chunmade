import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { handleApiError, ok } from "@/lib/api/response";
import { UnauthorizedError, ValidationError } from "@/lib/errors";
import type { PosOrderType, Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

const decimalLike = z.union([z.number(), z.string()]).transform((v) => Number(v));

const modifierSchema = z.object({
  name: z.string(),
  priceDelta: decimalLike.optional().default(0),
  qty: z.coerce.number().int().optional().default(1),
});

const itemSchema = z.object({
  productName: z.string().min(1),
  unitPrice: decimalLike.default(0),
  qty: z.coerce.number().int().positive().default(1),
  lineTotal: decimalLike.default(0),
  note: z.string().nullish(),
  modifiers: z.array(modifierSchema).optional().default([]),
});

const paymentSchema = z.object({
  method: z.string().min(1),
  amount: decimalLike.default(0),
  receivedAmount: decimalLike.nullish(),
  changeAmount: decimalLike.nullish(),
  paidAt: z.coerce.date().nullish(),
});

const orderSchema = z.object({
  posOrderId: z.string().min(1),
  orderNo: z.string().min(1),
  orderType: z.string().optional(),
  status: z.string().optional().default("Paid"),
  storeRef: z.string().nullish(),
  storeName: z.string().nullish(),
  subtotal: decimalLike.default(0),
  discountAmount: decimalLike.default(0),
  serviceFee: decimalLike.default(0),
  taxAmount: decimalLike.default(0),
  totalAmount: decimalLike.default(0),
  paidAmount: decimalLike.default(0),
  changeAmount: decimalLike.default(0),
  note: z.string().nullish(),
  businessDate: z.coerce.date().nullish(),
  placedAt: z.coerce.date().nullish(),
  paidAt: z.coerce.date().nullish(),
  items: z.array(itemSchema).default([]),
  payments: z.array(paymentSchema).default([]),
});

const bodySchema = z.union([
  z.object({ orders: z.array(orderSchema).min(1) }),
  orderSchema.transform((o) => ({ orders: [o] })),
]);

function mapOrderType(raw: string | undefined): PosOrderType {
  switch ((raw ?? "").toLowerCase()) {
    case "dinein":
    case "dine_in":
      return "DINE_IN";
    case "delivery":
      return "DELIVERY";
    case "takeout":
    case "takeaway":
    default:
      return "TAKEOUT";
  }
}

export async function POST(req: NextRequest) {
  try {
    const apiKey = req.headers.get("x-api-key");
    if (!apiKey || apiKey !== env.POS_SYNC_API_KEY) {
      throw new UnauthorizedError("API Key 無效");
    }

    const json = await req.json().catch(() => null);
    if (!json) throw new ValidationError("請求內容必須是 JSON");
    const { orders } = bodySchema.parse(json);

    const company = await prisma.company.findFirst({ where: { isActive: true } });
    if (!company) throw new ValidationError("系統尚未建立公司資料");

    // 以名稱對應 ERP 商品（best-effort）
    const names = Array.from(
      new Set(orders.flatMap((o) => o.items.map((i) => i.productName.trim())).filter(Boolean)),
    );
    const nameToItemId = new Map<string, string>();
    if (names.length > 0) {
      const items = await prisma.item.findMany({
        where: { companyId: company.id, deletedAt: null, name: { in: names } },
        select: { id: true, name: true },
      });
      for (const it of items) {
        if (!nameToItemId.has(it.name)) nameToItemId.set(it.name, it.id);
      }
    }

    const results: Array<{ posOrderId: string; cloudId: string; status: "ok" | "duplicate" }> = [];

    for (const o of orders) {
      const existing = await prisma.posOrder.findUnique({
        where: { posOrderId: o.posOrderId },
        select: { id: true },
      });
      if (existing) {
        results.push({ posOrderId: o.posOrderId, cloudId: existing.id, status: "duplicate" });
        continue;
      }

      const created = await prisma.posOrder.create({
        data: {
          companyId: company.id,
          posOrderId: o.posOrderId,
          orderNo: o.orderNo,
          orderType: mapOrderType(o.orderType),
          status: o.status,
          storeRef: o.storeRef ?? null,
          storeName: o.storeName ?? null,
          subtotal: o.subtotal,
          discountAmount: o.discountAmount,
          serviceFee: o.serviceFee,
          taxAmount: o.taxAmount,
          totalAmount: o.totalAmount,
          paidAmount: o.paidAmount,
          changeAmount: o.changeAmount,
          note: o.note ?? null,
          businessDate: o.businessDate ?? null,
          placedAt: o.placedAt ?? null,
          paidAt: o.paidAt ?? null,
          items: {
            create: o.items.map((i) => ({
              itemId: nameToItemId.get(i.productName.trim()) ?? null,
              productName: i.productName,
              unitPrice: i.unitPrice,
              qty: i.qty,
              lineTotal: i.lineTotal,
              note: i.note ?? null,
              modifiers:
                i.modifiers && i.modifiers.length > 0
                  ? (i.modifiers as unknown as Prisma.InputJsonValue)
                  : undefined,
            })),
          },
          payments: {
            create: o.payments.map((p) => ({
              method: p.method,
              amount: p.amount,
              receivedAmount: p.receivedAmount ?? null,
              changeAmount: p.changeAmount ?? null,
              paidAt: p.paidAt ?? null,
            })),
          },
        },
        select: { id: true },
      });

      results.push({ posOrderId: o.posOrderId, cloudId: created.id, status: "ok" });
    }

    return ok({ results });
  } catch (err) {
    return handleApiError(err);
  }
}

export function GET() {
  return NextResponse.json(
    { ok: true, data: { service: "pos-orders-sync", method: "POST" } },
    { status: 200 },
  );
}
