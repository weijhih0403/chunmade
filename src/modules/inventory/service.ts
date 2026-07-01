import "server-only";
import { ItemType } from "@prisma/client";
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

export type WarehouseStockRow = {
  itemId: string;
  sku: string;
  name: string;
  unit: string;
  type: ItemType;
  qty: Decimal;
  reorderPoint: Decimal;
  avgValue: Decimal;
  isLow: boolean;
};

/** 查詢單一倉庫的庫存（可依商品型別篩選，預設全部追蹤庫存品項） */
export async function listWarehouseStock(
  actor: Actor,
  warehouseId: string,
  opts?: { types?: ItemType[] },
) {
  const scope = companyScope(actor);
  const warehouse = await prisma.warehouse.findFirst({
    where: { ...scope, id: warehouseId, deletedAt: null },
    include: { store: { select: { name: true } } },
  });
  if (!warehouse) return null;

  const items = await prisma.item.findMany({
    where: {
      ...scope,
      deletedAt: null,
      trackStock: true,
      ...(opts?.types ? { type: { in: opts.types } } : {}),
    },
    include: { baseUnit: true },
    orderBy: { name: "asc" },
  });

  const balances = await prisma.stockBalance.findMany({
    where: { ...scope, warehouseId },
  });
  const byItem = new Map(balances.map((b) => [b.itemId, b]));

  const rows: WarehouseStockRow[] = items.map((it) => {
    const b = byItem.get(it.id);
    const qty = b?.quantity ?? ZERO;
    const avgValue = b ? b.quantity.mul(b.avgCost) : ZERO;
    const isLow = gt(it.reorderPoint, 0) && gte(it.reorderPoint, qty);
    return {
      itemId: it.id,
      sku: it.sku,
      name: it.name,
      unit: it.baseUnit.name,
      type: it.type,
      qty,
      reorderPoint: it.reorderPoint,
      avgValue,
      isLow,
    };
  });

  return { warehouse, rows };
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
    rows: count.items.map((ci) => {
      const item = itemMap.get(ci.itemId);
      return {
        ...ci,
        itemName: item?.name ?? ci.itemId,
        unit: item?.baseUnit.name ?? "",
        unitCode: item?.baseUnit.code ?? "",
      };
    }),
  };
}
