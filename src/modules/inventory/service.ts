import "server-only";
import { prisma } from "@/lib/db";
import { type Actor, companyScope } from "@/lib/permissions";
import { add, ZERO, type Decimal, gt, gte } from "@/lib/money";

export async function listWarehouses(actor: Actor) {
  const scope = companyScope(actor);
  return prisma.warehouse.findMany({
    where: { ...scope, deletedAt: null, isActive: true },
    orderBy: { code: "asc" },
  });
}

export type StockOverviewRow = {
  itemId: string;
  sku: string;
  name: string;
  unit: string;
  totalQty: Decimal;
  reorderPoint: Decimal;
  safetyStock: Decimal;
  avgValue: Decimal;
  isLow: boolean;
};

export async function listStockOverview(actor: Actor): Promise<StockOverviewRow[]> {
  const scope = companyScope(actor);
  const items = await prisma.item.findMany({
    where: { ...scope, deletedAt: null, trackStock: true },
    include: { baseUnit: true },
    orderBy: { name: "asc" },
  });

  const balances = await prisma.stockBalance.findMany({ where: scope });
  const qtyByItem = new Map<string, Decimal>();
  const valueByItem = new Map<string, Decimal>();
  for (const b of balances) {
    qtyByItem.set(b.itemId, add(qtyByItem.get(b.itemId) ?? ZERO, b.quantity));
    valueByItem.set(
      b.itemId,
      add(valueByItem.get(b.itemId) ?? ZERO, b.quantity.mul(b.avgCost)),
    );
  }

  return items.map((it) => {
    const totalQty = qtyByItem.get(it.id) ?? ZERO;
    const isLow = gt(it.reorderPoint, 0) && gte(it.reorderPoint, totalQty);
    return {
      itemId: it.id,
      sku: it.sku,
      name: it.name,
      unit: it.baseUnit.name,
      totalQty,
      reorderPoint: it.reorderPoint,
      safetyStock: it.safetyStock,
      avgValue: valueByItem.get(it.id) ?? ZERO,
      isLow,
    };
  });
}

export async function listMovements(actor: Actor, itemId?: string) {
  const scope = companyScope(actor);
  return prisma.stockMovement.findMany({
    where: { ...scope, ...(itemId ? { itemId } : {}) },
    include: { item: { select: { name: true, sku: true } } },
    orderBy: { occurredAt: "desc" },
    take: 100,
  });
}

export async function getTrackedItems(actor: Actor) {
  const scope = companyScope(actor);
  return prisma.item.findMany({
    where: { ...scope, deletedAt: null, trackStock: true },
    select: { id: true, name: true, sku: true },
    orderBy: { name: "asc" },
  });
}

export async function listCounts(actor: Actor) {
  const scope = companyScope(actor);
  return prisma.stockCount.findMany({
    where: { ...scope, deletedAt: null },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}

export async function getCount(actor: Actor, id: string) {
  const scope = companyScope(actor);
  const count = await prisma.stockCount.findFirst({
    where: { ...scope, id },
    include: { items: true },
  });
  if (!count) return null;
  const items = await prisma.item.findMany({
    where: { id: { in: count.items.map((i) => i.itemId) } },
    include: { baseUnit: true },
  });
  const itemMap = new Map(items.map((i) => [i.id, i]));
  return {
    count,
    rows: count.items.map((ci) => ({
      ...ci,
      itemName: itemMap.get(ci.itemId)?.name ?? ci.itemId,
      unit: itemMap.get(ci.itemId)?.baseUnit.name ?? "",
    })),
  };
}
