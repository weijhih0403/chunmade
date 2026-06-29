import "server-only";
import { prisma } from "@/lib/db";
import { type Actor, companyScope } from "@/lib/permissions";

export async function listRecipes(actor: Actor) {
  const scope = companyScope(actor);
  const recipes = await prisma.recipe.findMany({
    where: { ...scope, deletedAt: null },
    include: { product: { select: { name: true, sku: true } }, versions: true },
    orderBy: { createdAt: "desc" },
  });
  return recipes;
}

export async function getRecipe(actor: Actor, id: string) {
  const scope = companyScope(actor);
  const recipe = await prisma.recipe.findFirst({
    where: { ...scope, id },
    include: {
      product: { include: { baseUnit: true } },
      versions: { include: { items: true }, orderBy: { version: "desc" } },
    },
  });
  if (!recipe) return null;
  const materialIds = recipe.versions.flatMap((v) => v.items.map((i) => i.materialId));
  const materials = await prisma.item.findMany({
    where: { id: { in: materialIds } },
    include: { baseUnit: true },
  });
  const matMap = new Map(materials.map((m) => [m.id, m]));
  return { recipe, matMap };
}

/** 可生產的產品（具備啟用配方版本者） */
export async function getProducibleProducts(actor: Actor) {
  const scope = companyScope(actor);
  const recipes = await prisma.recipe.findMany({
    where: { ...scope, deletedAt: null, isActive: true },
    include: {
      product: { select: { id: true, name: true, sku: true } },
      versions: { where: { isActive: true }, orderBy: { version: "desc" }, take: 1 },
    },
  });
  return recipes
    .filter((r) => r.versions.length > 0)
    .map((r) => ({
      recipeId: r.id,
      productId: r.productId,
      productName: r.product.name,
      productSku: r.product.sku,
      versionId: r.versions[0]!.id,
      version: r.versions[0]!.version,
      outputQty: r.versions[0]!.outputQty,
    }));
}

export async function listProductionOrders(actor: Actor) {
  const scope = companyScope(actor);
  const orders = await prisma.productionOrder.findMany({
    where: { ...scope, deletedAt: null },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  const productIds = orders.map((o) => o.productId);
  const products = await prisma.item.findMany({
    where: { id: { in: productIds } },
    select: { id: true, name: true },
  });
  const pmap = new Map(products.map((p) => [p.id, p.name]));
  return orders.map((o) => ({ ...o, productName: pmap.get(o.productId) ?? o.productId }));
}

export async function getProductionOrder(actor: Actor, id: string) {
  const scope = companyScope(actor);
  const mo = await prisma.productionOrder.findFirst({
    where: { ...scope, id },
    include: { materials: true, outputs: true },
  });
  if (!mo) return null;
  const itemIds = [mo.productId, ...mo.materials.map((m) => m.itemId)];
  const items = await prisma.item.findMany({
    where: { id: { in: itemIds } },
    include: { baseUnit: true },
  });
  const imap = new Map(items.map((i) => [i.id, i]));
  return {
    mo,
    productName: imap.get(mo.productId)?.name ?? mo.productId,
    materials: mo.materials.map((m) => ({
      ...m,
      itemName: imap.get(m.itemId)?.name ?? m.itemId,
      unit: imap.get(m.itemId)?.baseUnit.name ?? "",
    })),
  };
}
