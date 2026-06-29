import "server-only";
import { prisma } from "@/lib/db";
import { type Actor, companyScope, assertStoreAccess } from "@/lib/permissions";
import { NotFoundError } from "@/lib/errors";

export type PosContext = {
  storeId: string;
  storeName: string;
  warehouseId: string;
};

/** 解析收銀員所屬門市與對應倉庫 */
export async function getPosContext(actor: Actor): Promise<PosContext> {
  const scope = companyScope(actor);
  const storeId = actor.storeIds[0];
  const store = storeId
    ? await prisma.store.findFirst({ where: { ...scope, id: storeId, deletedAt: null } })
    : await prisma.store.findFirst({ where: { ...scope, deletedAt: null }, orderBy: { code: "asc" } });
  if (!store) throw new NotFoundError("找不到可用門市");
  assertStoreAccess(actor, store.id);

  const warehouse =
    (await prisma.warehouse.findFirst({
      where: { ...scope, storeId: store.id, deletedAt: null, isActive: true },
    })) ??
    (await prisma.warehouse.findFirst({ where: { ...scope, deletedAt: null, isActive: true } }));
  if (!warehouse) throw new NotFoundError("找不到可用倉庫");

  return { storeId: store.id, storeName: store.name, warehouseId: warehouse.id };
}

export async function getPosCatalog(actor: Actor) {
  const scope = companyScope(actor);
  const items = await prisma.item.findMany({
    where: {
      ...scope,
      deletedAt: null,
      isActive: true,
      type: { in: ["SALE_ITEM", "FINISHED_GOOD"] },
    },
    include: { category: true },
    orderBy: [{ category: { sortOrder: "asc" } }, { name: "asc" }],
  });
  return items.map((i) => ({
    id: i.id,
    name: i.name,
    sku: i.sku,
    price: Number(i.price),
    categoryName: i.category?.name ?? "未分類",
  }));
}

export async function listSalesOrders(actor: Actor) {
  const scope = companyScope(actor);
  return prisma.salesOrder.findMany({
    where: { ...scope, deletedAt: null },
    include: { items: true, payments: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
}

export async function getSalesOrder(actor: Actor, id: string) {
  const scope = companyScope(actor);
  return prisma.salesOrder.findFirst({
    where: { ...scope, id },
    include: { items: { include: { modifiers: true } }, payments: true, refunds: true },
  });
}
