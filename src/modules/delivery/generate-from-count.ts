import "server-only";

import { subDays } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { APP_TZ, endOfBusinessDay, formatDate, startOfBusinessDay } from "@/lib/dates";
import { add, gt, toDecimal, ZERO } from "@/lib/money";
import { writeAudit } from "@/lib/audit";
import { type Actor, assertStoreAccess, companyScope } from "@/lib/permissions";
import { nextDocumentNo } from "@/server/services/sequence";

export type EnsureDeliveryResult =
  | { ok: true; created: true; deliveryId: string; deliveryNo: string; itemCount: number }
  | { ok: true; created: false; deliveryId?: string; reason: "exists" | "no_warehouse" | "no_count" | "no_order" }
  | { ok: false; reason: string };

function previousBusinessDayRange(reference = new Date()) {
  const prev = subDays(toZonedTime(reference, APP_TZ), 1);
  return {
    start: startOfBusinessDay(prev),
    end: endOfBusinessDay(prev),
    label: formatDate(prev),
  };
}

async function warehousesForStore(companyId: string, storeId: string) {
  return prisma.warehouse.findMany({
    where: { companyId, storeId, deletedAt: null, isActive: true },
    select: { id: true, name: true },
  });
}

async function yesterdayCompletedCounts(companyId: string, warehouseIds: string[]) {
  if (warehouseIds.length === 0) return [];
  const { start, end } = previousBusinessDayRange();
  return prisma.stockCount.findMany({
    where: {
      companyId,
      warehouseId: { in: warehouseIds },
      status: "COMPLETED",
      deletedAt: null,
      completedAt: { gte: start, lte: end },
    },
    include: { items: true },
    orderBy: { completedAt: "desc" },
  });
}

function mergeOrderLines(
  counts: { countNo: string; items: { itemId: string; orderQty: Prisma.Decimal }[] }[],
) {
  const merged = new Map<string, Prisma.Decimal>();
  for (const count of counts) {
    for (const row of count.items) {
      const qty = toDecimal(row.orderQty);
      if (!gt(qty, ZERO)) continue;
      merged.set(row.itemId, add(merged.get(row.itemId) ?? ZERO, qty));
    }
  }
  return Array.from(merged.entries()).map(([itemId, quantity], sortOrder) => ({
    itemId,
    quantity,
    sortOrder,
  }));
}

export async function getYesterdayOrderPreview(actor: Actor, storeId: string) {
  const scope = companyScope(actor);
  assertStoreAccess(actor, storeId);
  const warehouses = await warehousesForStore(scope.companyId, storeId);
  const counts = await yesterdayCompletedCounts(
    scope.companyId,
    warehouses.map((w) => w.id),
  );
  const lines = mergeOrderLines(counts);
  const { label } = previousBusinessDayRange();
  return {
    countDateLabel: label,
    countNos: counts.map((c) => c.countNo),
    orderItemCount: lines.length,
    hasWarehouse: warehouses.length > 0,
    hasCount: counts.length > 0,
  };
}

/** 依昨日盤點叫貨量，為指定門市建立今日送貨單（若尚無） */
export async function ensureDeliveryFromYesterdayCount(
  actor: Actor,
  storeId: string,
): Promise<EnsureDeliveryResult> {
  const scope = companyScope(actor);
  assertStoreAccess(actor, storeId);
  const today = startOfBusinessDay();

  const existing = await prisma.deliveryNote.findFirst({
    where: { ...scope, storeId, deliveryDate: today, deletedAt: null },
    select: { id: true, deliveryNo: true, items: { select: { id: true } } },
  });
  if (existing && existing.items.length > 0) {
    return { ok: true, created: false, deliveryId: existing.id, reason: "exists" };
  }

  const warehouses = await warehousesForStore(scope.companyId, storeId);
  if (warehouses.length === 0) {
    return { ok: true, created: false, reason: "no_warehouse" };
  }

  const counts = await yesterdayCompletedCounts(
    scope.companyId,
    warehouses.map((w) => w.id),
  );
  if (counts.length === 0) {
    return { ok: true, created: false, reason: "no_count" };
  }

  const lines = mergeOrderLines(counts);
  if (lines.length === 0) {
    return { ok: true, created: false, reason: "no_order" };
  }

  const countLabel = counts.map((c) => c.countNo).join("、");
  const { label: countDateLabel } = previousBusinessDayRange();
  const noteText = `由 ${countDateLabel} 盤點（${countLabel}）叫貨自動產生`;

  const created = await prisma.$transaction(async (tx) => {
    if (existing) {
      await tx.deliveryNoteItem.deleteMany({ where: { deliveryId: existing.id } });
      await tx.deliveryNote.update({
        where: { id: existing.id },
        data: { note: noteText, status: "IN_PROGRESS", completedAt: null },
      });
      await tx.deliveryNoteItem.createMany({
        data: lines.map((line) => ({
          deliveryId: existing.id,
          itemId: line.itemId,
          quantity: line.quantity,
          sortOrder: line.sortOrder,
        })),
      });
      return { id: existing.id, deliveryNo: existing.deliveryNo };
    }

    const deliveryNo = await nextDocumentNo(tx, scope.companyId, "DELIVERY_NOTE");
    const note = await tx.deliveryNote.create({
      data: {
        companyId: scope.companyId,
        storeId,
        deliveryNo,
        deliveryDate: today,
        note: noteText,
        createdBy: actor.id,
        items: {
          create: lines.map((line) => ({
            itemId: line.itemId,
            quantity: line.quantity,
            sortOrder: line.sortOrder,
          })),
        },
      },
    });
    await writeAudit(tx, {
      companyId: scope.companyId,
      userId: actor.id,
      action: "CREATE",
      entityType: "DeliveryNote",
      entityId: note.id,
      after: { deliveryNo, storeId, source: "stock_count", countNos: countLabel },
    });
    return { id: note.id, deliveryNo: note.deliveryNo };
  });

  return {
    ok: true,
    created: true,
    deliveryId: created.id,
    deliveryNo: created.deliveryNo,
    itemCount: lines.length,
  };
}

/** 為所有可存取門市自動產生今日送貨單 */
export async function ensureTodayDeliveriesFromCounts(actor: Actor) {
  const stores = await prisma.store.findMany({
    where: { ...companyScope(actor), deletedAt: null, isActive: true },
    orderBy: { code: "asc" },
  });
  const results: EnsureDeliveryResult[] = [];
  for (const store of stores) {
    try {
      assertStoreAccess(actor, store.id);
      results.push(await ensureDeliveryFromYesterdayCount(actor, store.id));
    } catch {
      // skip inaccessible stores
    }
  }
  return results;
}
