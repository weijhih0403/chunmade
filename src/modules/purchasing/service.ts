import "server-only";
import { prisma } from "@/lib/db";
import { type Actor, companyScope } from "@/lib/permissions";

export async function listSuppliers(actor: Actor) {
  const scope = companyScope(actor);
  return prisma.supplier.findMany({
    where: { ...scope, deletedAt: null },
    orderBy: { code: "asc" },
  });
}

export async function listPurchaseOrders(actor: Actor) {
  const scope = companyScope(actor);
  return prisma.purchaseOrder.findMany({
    where: { ...scope, deletedAt: null },
    include: { supplier: true, items: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
}

export async function getPurchaseOrder(actor: Actor, id: string) {
  const scope = companyScope(actor);
  const po = await prisma.purchaseOrder.findFirst({
    where: { ...scope, id },
    include: { supplier: true, items: true, receipts: { include: { items: true } } },
  });
  if (!po) return null;
  const items = await prisma.item.findMany({
    where: { id: { in: po.items.map((i) => i.itemId) } },
    include: { baseUnit: true },
  });
  const itemMap = new Map(items.map((i) => [i.id, i]));
  return {
    po,
    lines: po.items.map((l) => ({
      ...l,
      itemName: itemMap.get(l.itemId)?.name ?? l.itemId,
      unit: itemMap.get(l.itemId)?.baseUnit.name ?? "",
    })),
  };
}
