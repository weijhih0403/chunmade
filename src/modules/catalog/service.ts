import "server-only";
import { ItemType } from "@prisma/client";
import { prisma } from "@/lib/db";
import { type Actor, companyScope } from "@/lib/permissions";

export async function listItems(
  actor: Actor,
  filters?: { type?: ItemType; search?: string },
) {
  const scope = companyScope(actor);
  return prisma.item.findMany({
    where: {
      ...scope,
      deletedAt: null,
      ...(filters?.type ? { type: filters.type } : {}),
      ...(filters?.search
        ? {
            OR: [
              { name: { contains: filters.search, mode: "insensitive" } },
              { sku: { contains: filters.search, mode: "insensitive" } },
              { barcode: { contains: filters.search } },
            ],
          }
        : {}),
    },
    include: { category: true, baseUnit: true },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
}

export async function getItem(actor: Actor, id: string) {
  const scope = companyScope(actor);
  return prisma.item.findFirst({ where: { ...scope, id, deletedAt: null } });
}

export async function getCatalogFormData(actor: Actor) {
  const scope = companyScope(actor);
  const [categories, units] = await Promise.all([
    prisma.category.findMany({ where: { ...scope, deletedAt: null }, orderBy: { name: "asc" } }),
    prisma.unit.findMany({ where: { ...scope, deletedAt: null }, orderBy: { name: "asc" } }),
  ]);
  return { categories, units };
}

export async function listCategories(actor: Actor) {
  const scope = companyScope(actor);
  return prisma.category.findMany({
    where: { ...scope, deletedAt: null },
    orderBy: { code: "asc" },
  });
}

export async function listUnits(actor: Actor) {
  const scope = companyScope(actor);
  return prisma.unit.findMany({ where: { ...scope, deletedAt: null }, orderBy: { code: "asc" } });
}
