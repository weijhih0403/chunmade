import "server-only";
import { ItemType } from "@prisma/client";
import { prisma } from "@/lib/db";
import { type Actor, companyScope } from "@/lib/permissions";

export async function listItems(
  actor: Actor,
  filters?: {
    type?: ItemType;
    types?: ItemType[];
    search?: string;
    page?: number;
    pageSize?: number;
  },
) {
  const scope = companyScope(actor);
  const page = Math.max(1, filters?.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, filters?.pageSize ?? 50));
  const where = {
    ...scope,
    deletedAt: null,
    ...(filters?.type ? { type: filters.type } : {}),
    ...(filters?.types ? { type: { in: filters.types } } : {}),
    ...(filters?.search
      ? {
          OR: [
            { name: { contains: filters.search, mode: "insensitive" as const } },
            { sku: { contains: filters.search, mode: "insensitive" as const } },
            { barcode: { contains: filters.search } },
          ],
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.item.findMany({
      where,
      include: { category: true, baseUnit: true },
      orderBy: { name: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.item.count({ where }),
  ]);

  return { items, total, page, pageSize };
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
