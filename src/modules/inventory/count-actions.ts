"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requirePermission, companyScope } from "@/lib/permissions";
import { writeAudit } from "@/lib/audit";
import { BusinessRuleError } from "@/lib/errors";
import { applyStockMovement } from "@/server/services/stock";
import { nextDocumentNo } from "@/server/services/sequence";
import { add, sub, toDecimal, ZERO, eq } from "@/lib/money";

/** 建立盤點單：快照指定倉庫所有追蹤庫存品項的系統數量 */
export async function createCountAction(formData: FormData) {
  const actor = await requirePermission("inventory.count");
  const scope = companyScope(actor);
  const warehouseId = String(formData.get("warehouseId") ?? "");
  if (!warehouseId) throw new BusinessRuleError("請選擇倉庫");

  const balances = await prisma.stockBalance.findMany({
    where: { ...scope, warehouseId },
  });
  const qtyByItem = new Map<string, ReturnType<typeof toDecimal>>();
  for (const b of balances) {
    qtyByItem.set(b.itemId, add(qtyByItem.get(b.itemId) ?? ZERO, b.quantity));
  }
  const items = await prisma.item.findMany({
    where: {
      ...scope,
      deletedAt: null,
      trackStock: true,
      type: { in: ["RAW_MATERIAL", "SEMI_FINISHED"] },
    },
    select: { id: true },
  });

  let countId = "";
  await prisma.$transaction(async (tx) => {
    const countNo = await nextDocumentNo(tx, scope.companyId, "STOCK_COUNT");
    const count = await tx.stockCount.create({
      data: {
        companyId: scope.companyId,
        countNo,
        warehouseId,
        status: "COUNTING",
        createdBy: actor.id,
        items: {
          create: items.map((it) => {
            const sys = qtyByItem.get(it.id) ?? ZERO;
            return {
              itemId: it.id,
              systemQty: sys,
              countedQty: ZERO,
              differenceQty: ZERO,
            };
          }),
        },
      },
    });
    countId = count.id;
    await writeAudit(tx, {
      companyId: scope.companyId,
      userId: actor.id,
      action: "CREATE",
      entityType: "StockCount",
      entityId: count.id,
      after: { countNo, warehouseId },
    });
  });

  redirect(`/dashboard/counts/${countId}`);
}

/** 刪除盤點單：軟刪除（限非已完成狀態，已完成會牽動庫存異動故保留） */
export async function deleteCountAction(formData: FormData) {
  const actor = await requirePermission("inventory.count");
  const scope = companyScope(actor);
  const countId = String(formData.get("countId") ?? "");

  const count = await prisma.stockCount.findFirst({
    where: { ...scope, id: countId, deletedAt: null },
  });
  if (!count) throw new BusinessRuleError("找不到盤點單");
  if (count.status === "COMPLETED") throw new BusinessRuleError("已完成的盤點單無法刪除");

  await prisma.$transaction(async (tx) => {
    await tx.stockCount.update({
      where: { id: count.id },
      data: { deletedAt: new Date(), status: "CANCELLED" },
    });
    await writeAudit(tx, {
      companyId: scope.companyId,
      userId: actor.id,
      action: "DELETE",
      entityType: "StockCount",
      entityId: count.id,
      before: { countNo: count.countNo, status: count.status },
    });
  });

  revalidatePath("/dashboard/counts");
}

/** 完成盤點：依差異產生盤盈 / 盤虧異動 */
export async function completeCountAction(formData: FormData) {
  const actor = await requirePermission("inventory.count");
  const scope = companyScope(actor);
  const countId = String(formData.get("countId") ?? "");

  const count = await prisma.stockCount.findFirst({
    where: { ...scope, id: countId },
    include: { items: true },
  });
  if (!count) throw new BusinessRuleError("找不到盤點單");
  if (count.status !== "COUNTING") throw new BusinessRuleError("此盤點單狀態無法完成");

  await prisma.$transaction(async (tx) => {
    for (const ci of count.items) {
      const countedRaw = formData.get(`counted_${ci.itemId}`);
      const counted = toDecimal(
        countedRaw != null && countedRaw !== "" ? String(countedRaw) : "0",
      );
      const diff = sub(counted, ci.systemQty);

      await tx.stockCountItem.update({
        where: { id: ci.id },
        data: { countedQty: counted, differenceQty: diff },
      });

      if (!eq(diff, 0)) {
        const isGain = diff.greaterThan(0);
        await applyStockMovement(tx, {
          companyId: scope.companyId,
          warehouseId: count.warehouseId,
          itemId: ci.itemId,
          type: isGain ? "ADJUSTMENT_IN" : "ADJUSTMENT_OUT",
          quantity: diff.abs(),
          reason: `盤點 ${count.countNo}`,
          sourceType: "COUNT",
          sourceId: count.id,
          sourceNo: count.countNo,
          operatorId: actor.id,
          allowNegative: true,
        });
      }
    }

    await tx.stockCount.update({
      where: { id: count.id },
      data: { status: "COMPLETED", completedAt: new Date() },
    });
    await writeAudit(tx, {
      companyId: scope.companyId,
      userId: actor.id,
      action: "COMPLETE",
      entityType: "StockCount",
      entityId: count.id,
      after: { countNo: count.countNo },
    });
  });

  revalidatePath(`/dashboard/counts/${countId}`);
  revalidatePath("/dashboard/inventory");
  redirect("/dashboard/counts?completed=1");
}
