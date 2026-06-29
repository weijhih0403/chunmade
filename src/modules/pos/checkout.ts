"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requirePermission, companyScope } from "@/lib/permissions";
import { writeAudit } from "@/lib/audit";
import { toFormError } from "@/lib/forms";
import { BusinessRuleError } from "@/lib/errors";
import { add, mul, sub, toDecimal, ZERO } from "@/lib/money";
import { applyStockMovement } from "@/server/services/stock";
import { nextDocumentNo } from "@/server/services/sequence";
import { buildPickupLabel } from "@/lib/print/tspl";
import { getPosContext } from "./service";
import { checkoutSchema, refundSchema, type CheckoutInput } from "./schemas";

export type CheckoutResult =
  | { ok: true; orderId: string; orderNo: string; total: string; change: string; reused: boolean }
  | { ok: false; message: string };

export async function checkoutAction(input: CheckoutInput): Promise<CheckoutResult> {
  try {
    const actor = await requirePermission("pos.operate");
    const scope = companyScope(actor);
    const data = checkoutSchema.parse(input);

    // 冪等：相同 key 直接回傳既有訂單
    const existed = await prisma.salesOrder.findUnique({
      where: { idempotencyKey: data.idempotencyKey },
    });
    if (existed) {
      return {
        ok: true,
        orderId: existed.id,
        orderNo: existed.orderNo,
        total: existed.total.toString(),
        change: existed.changeAmount.toString(),
        reused: true,
      };
    }

    const ctx = await getPosContext(actor);

    // 後端重新計價（不信任前端價格）
    const itemIds = data.lines.map((l) => l.itemId);
    const items = await prisma.item.findMany({
      where: { ...scope, id: { in: itemIds }, deletedAt: null },
    });
    const itemMap = new Map(items.map((i) => [i.id, i]));

    let subtotal = ZERO;
    const lineCalc = data.lines.map((l) => {
      const item = itemMap.get(l.itemId);
      if (!item) throw new BusinessRuleError("商品不存在或已停用");
      const qty = toDecimal(l.quantity);
      const unitPrice = toDecimal(item.price);
      const lineTotal = mul(unitPrice, qty);
      subtotal = add(subtotal, lineTotal);
      return { item, qty, unitPrice, lineTotal, note: l.note ?? null };
    });
    const total = subtotal;

    const tendered = toDecimal(data.amountTendered);
    if (data.paymentMethod === "CASH" && tendered.lessThan(total)) {
      throw new BusinessRuleError("收取現金不足");
    }
    const paidTotal = data.paymentMethod === "CASH" ? tendered : total;
    const change = data.paymentMethod === "CASH" ? sub(tendered, total) : ZERO;

    try {
      const order = await prisma.$transaction(async (tx) => {
        const orderNo = await nextDocumentNo(tx, scope.companyId, "SALES_ORDER");
        const created = await tx.salesOrder.create({
          data: {
            companyId: scope.companyId,
            storeId: ctx.storeId,
            warehouseId: ctx.warehouseId,
            orderNo,
            channel: data.channel,
            status: "PAID",
            subtotal,
            total,
            paidTotal,
            changeAmount: change,
            idempotencyKey: data.idempotencyKey,
            customerId: data.customerId || null,
            placedAt: new Date(),
            paidAt: new Date(),
            createdBy: actor.id,
            cashierId: actor.id,
          },
        });

        let costTotal = ZERO;
        for (const lc of lineCalc) {
          let unitCost = toDecimal(lc.item.standardCost);
          if (lc.item.trackStock) {
            const result = await applyStockMovement(tx, {
              companyId: scope.companyId,
              storeId: ctx.storeId,
              warehouseId: ctx.warehouseId,
              itemId: lc.item.id,
              type: "SALE",
              quantity: lc.qty,
              sourceType: "SALES_ORDER",
              sourceId: created.id,
              sourceNo: orderNo,
              operatorId: actor.id,
            });
            unitCost = result.avgCost;
          }
          costTotal = add(costTotal, mul(unitCost, lc.qty));
          await tx.salesOrderItem.create({
            data: {
              orderId: created.id,
              itemId: lc.item.id,
              name: lc.item.name,
              quantity: lc.qty,
              unitPrice: lc.unitPrice,
              unitCost,
              lineTotal: lc.lineTotal,
              note: lc.note,
            },
          });
        }

        await tx.salesOrder.update({
          where: { id: created.id },
          data: { costTotal, grossProfit: sub(total, costTotal) },
        });

        await tx.payment.create({
          data: {
            companyId: scope.companyId,
            orderId: created.id,
            method: data.paymentMethod,
            amount: paidTotal,
            status: "PAID",
            createdBy: actor.id,
          },
        });

        // 出單標籤（交由列印代理）
        const payload = buildPickupLabel({
          storeName: ctx.storeName,
          orderNo,
          items: lineCalc.map((lc) => ({ name: lc.item.name, quantity: Number(lc.qty) })),
        });
        await tx.printJob.create({
          data: {
            companyId: scope.companyId,
            storeId: ctx.storeId,
            orderId: created.id,
            status: "PENDING",
            payload,
          },
        });

        await writeAudit(tx, {
          companyId: scope.companyId,
          userId: actor.id,
          action: "CHECKOUT",
          entityType: "SalesOrder",
          entityId: created.id,
          after: { orderNo, total: total.toString() },
        });

        return created;
      });

      revalidatePath("/dashboard/sales");
      revalidatePath("/dashboard/inventory");
      return {
        ok: true,
        orderId: order.id,
        orderNo: order.orderNo,
        total: total.toString(),
        change: change.toString(),
        reused: false,
      };
    } catch (e) {
      // 冪等鍵競爭：回傳既有訂單
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
        const dup = await prisma.salesOrder.findUnique({
          where: { idempotencyKey: data.idempotencyKey },
        });
        if (dup) {
          return {
            ok: true,
            orderId: dup.id,
            orderNo: dup.orderNo,
            total: dup.total.toString(),
            change: dup.changeAmount.toString(),
            reused: true,
          };
        }
      }
      throw e;
    }
  } catch (err) {
    return { ok: false, message: toFormError(err).message ?? "結帳失敗" };
  }
}

/** 全額退款：回補庫存並標記訂單為已退款 */
export async function refundOrderAction(formData: FormData) {
  const actor = await requirePermission("sales.refund");
  const scope = companyScope(actor);
  const data = refundSchema.parse({
    orderId: formData.get("orderId"),
    reason: formData.get("reason") || undefined,
  });

  const order = await prisma.salesOrder.findFirst({
    where: { ...scope, id: data.orderId },
    include: { items: true },
  });
  if (!order) throw new BusinessRuleError("找不到訂單");
  if (order.status === "REFUNDED") throw new BusinessRuleError("訂單已退款");
  if (order.status === "CANCELLED") throw new BusinessRuleError("訂單已取消");

  await prisma.$transaction(async (tx) => {
    const refundNo = await nextDocumentNo(tx, scope.companyId, "REFUND");
    for (const line of order.items) {
      const item = await tx.item.findUnique({ where: { id: line.itemId } });
      if (item?.trackStock) {
        await applyStockMovement(tx, {
          companyId: scope.companyId,
          storeId: order.storeId,
          warehouseId: order.warehouseId,
          itemId: line.itemId,
          type: "RETURN_IN",
          quantity: line.quantity,
          unitCost: line.unitCost,
          sourceType: "REFUND",
          sourceId: order.id,
          sourceNo: refundNo,
          operatorId: actor.id,
        });
      }
    }
    await tx.refund.create({
      data: {
        companyId: scope.companyId,
        orderId: order.id,
        refundNo,
        amount: order.total,
        reason: data.reason ?? null,
        createdBy: actor.id,
      },
    });
    await tx.salesOrder.update({
      where: { id: order.id },
      data: { status: "REFUNDED", cancelledAt: new Date() },
    });
    await writeAudit(tx, {
      companyId: scope.companyId,
      userId: actor.id,
      action: "REFUND",
      entityType: "SalesOrder",
      entityId: order.id,
      after: { refundNo, amount: order.total.toString() },
    });
  });

  revalidatePath(`/dashboard/sales/${data.orderId}`);
  revalidatePath("/dashboard/inventory");
}
