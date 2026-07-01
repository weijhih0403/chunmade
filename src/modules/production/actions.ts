"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requirePermission, companyScope } from "@/lib/permissions";
import { writeAudit } from "@/lib/audit";
import { BusinessRuleError, NotFoundError } from "@/lib/errors";
import { type FormState, toFormError } from "@/lib/forms";
import { add, mul, div, toDecimal, ZERO } from "@/lib/money";
import { nextDocumentNo } from "@/server/services/sequence";
import { applyStockMovement } from "@/server/services/stock";
import { recipeSchema, productionOrderSchema } from "./schemas";

export async function createRecipeAction(_prev: FormState, formData: FormData): Promise<FormState> {
  try {
    const actor = await requirePermission("production.manage");
    const scope = companyScope(actor);
    const lines = JSON.parse(String(formData.get("lines") ?? "[]"));
    const data = recipeSchema.parse({
      productId: formData.get("productId"),
      name: formData.get("name"),
      outputQty: formData.get("outputQty"),
      lines,
    });

    await prisma.$transaction(async (tx) => {
      const recipe = await tx.recipe.create({
        data: { companyId: scope.companyId, productId: data.productId, name: data.name },
      });
      await tx.recipeVersion.create({
        data: {
          companyId: scope.companyId,
          recipeId: recipe.id,
          version: 1,
          outputQty: toDecimal(data.outputQty),
          createdBy: actor.id,
          items: {
            create: data.lines.map((l) => ({
              companyId: scope.companyId,
              materialId: l.materialId,
              quantity: toDecimal(l.quantity),
              wasteRate: toDecimal(l.wasteRate),
            })),
          },
        },
      });
      await writeAudit(tx, {
        companyId: scope.companyId,
        userId: actor.id,
        action: "CREATE",
        entityType: "Recipe",
        entityId: recipe.id,
        after: { name: data.name },
      });
    });

    revalidatePath("/dashboard/recipes");
    return { ok: true, message: `配方「${data.name}」已建立` };
  } catch (err) {
    return toFormError(err);
  }
}

export async function updateRecipeAction(_prev: FormState, formData: FormData): Promise<FormState> {
  try {
    const actor = await requirePermission("production.manage");
    const scope = companyScope(actor);
    const id = String(formData.get("id") ?? "");
    const lines = JSON.parse(String(formData.get("lines") ?? "[]"));

    const recipe = await prisma.recipe.findFirst({ where: { ...scope, id, deletedAt: null } });
    if (!recipe) throw new NotFoundError("找不到配方");

    const data = recipeSchema.parse({
      productId: recipe.productId,
      name: formData.get("name"),
      outputQty: formData.get("outputQty"),
      lines,
    });

    await prisma.$transaction(async (tx) => {
      await tx.recipe.update({ where: { id }, data: { name: data.name } });

      const latest = await tx.recipeVersion.findFirst({
        where: { recipeId: id },
        orderBy: { version: "desc" },
      });
      const nextVersion = (latest?.version ?? 0) + 1;

      await tx.recipeVersion.updateMany({
        where: { recipeId: id, isActive: true },
        data: { isActive: false },
      });

      await tx.recipeVersion.create({
        data: {
          companyId: scope.companyId,
          recipeId: id,
          version: nextVersion,
          outputQty: toDecimal(data.outputQty),
          createdBy: actor.id,
          items: {
            create: data.lines.map((l) => ({
              companyId: scope.companyId,
              materialId: l.materialId,
              quantity: toDecimal(l.quantity),
              wasteRate: toDecimal(l.wasteRate),
            })),
          },
        },
      });

      await writeAudit(tx, {
        companyId: scope.companyId,
        userId: actor.id,
        action: "UPDATE",
        entityType: "Recipe",
        entityId: id,
        after: { name: data.name, version: nextVersion },
      });
    });

    revalidatePath("/dashboard/recipes");
    revalidatePath(`/dashboard/recipes/${id}`);
    return { ok: true, message: `配方「${data.name}」已更新（新版本）` };
  } catch (err) {
    return toFormError(err);
  }
}

export async function createProductionOrderAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  try {
    const actor = await requirePermission("production.manage");
    const scope = companyScope(actor);
    const data = productionOrderSchema.parse({
      recipeVersionId: formData.get("recipeVersionId"),
      warehouseId: formData.get("warehouseId"),
      plannedQty: formData.get("plannedQty"),
    });

    const version = await prisma.recipeVersion.findFirst({
      where: { ...scope, id: data.recipeVersionId },
      include: { recipe: true, items: true },
    });
    if (!version) throw new NotFoundError("找不到配方版本");

    const factor = div(data.plannedQty, version.outputQty);

    const mo = await prisma.$transaction(async (tx) => {
      const orderNo = await nextDocumentNo(tx, scope.companyId, "PRODUCTION_ORDER");
      const created = await tx.productionOrder.create({
        data: {
          companyId: scope.companyId,
          warehouseId: data.warehouseId,
          orderNo,
          productId: version.recipe.productId,
          recipeVersionId: version.id,
          status: "RELEASED",
          plannedQty: toDecimal(data.plannedQty),
          createdBy: actor.id,
          materials: {
            create: version.items.map((it) => ({
              itemId: it.materialId,
              plannedQty: mul(mul(it.quantity, factor), add(1, it.wasteRate)),
            })),
          },
        },
      });
      await writeAudit(tx, {
        companyId: scope.companyId,
        userId: actor.id,
        action: "CREATE",
        entityType: "ProductionOrder",
        entityId: created.id,
        after: { orderNo, plannedQty: data.plannedQty },
      });
      return created;
    });

    revalidatePath("/dashboard/production");
    return { ok: true, message: `生產單 ${mo.orderNo} 已建立` };
  } catch (err) {
    return toFormError(err);
  }
}

/** 完工：扣除原料、增加成品庫存、計算成本與批號 */
export async function completeProductionAction(formData: FormData) {
  const actor = await requirePermission("production.execute");
  const scope = companyScope(actor);
  const id = String(formData.get("productionId"));
  const producedQty = toDecimal(String(formData.get("producedQty") ?? "0"));
  if (producedQty.lessThanOrEqualTo(0)) throw new BusinessRuleError("實際產量需大於 0");

  const mo = await prisma.productionOrder.findFirst({
    where: { ...scope, id },
    include: { materials: true },
  });
  if (!mo) throw new NotFoundError("找不到生產單");
  if (mo.status !== "RELEASED" && mo.status !== "IN_PROGRESS") {
    throw new BusinessRuleError("生產單狀態無法完工");
  }

  const product = await prisma.item.findUnique({ where: { id: mo.productId } });
  if (!product) throw new NotFoundError("找不到產出品項");

  const ratio = div(producedQty, mo.plannedQty);

  await prisma.$transaction(async (tx) => {
    let totalCost = ZERO;

    for (const mat of mo.materials) {
      const issueQty = mul(mat.plannedQty, ratio);
      if (issueQty.lessThanOrEqualTo(0)) continue;
      const result = await applyStockMovement(tx, {
        companyId: scope.companyId,
        warehouseId: mo.warehouseId,
        itemId: mat.itemId,
        type: "PRODUCTION_ISSUE",
        quantity: issueQty,
        sourceType: "PRODUCTION",
        sourceId: mo.id,
        sourceNo: mo.orderNo,
        operatorId: actor.id,
      });
      const lineCost = mul(issueQty, result.avgCost);
      totalCost = add(totalCost, lineCost);
      await tx.productionMaterial.update({
        where: { id: mat.id },
        data: { issuedQty: issueQty, unitCost: result.avgCost },
      });
    }

    const unitCost = producedQty.greaterThan(0) ? div(totalCost, producedQty) : ZERO;

    // 成品批號 + 效期
    const lotNo = mo.orderNo;
    const manufacturedAt = new Date();
    const expiresAt = product.shelfLifeDays
      ? new Date(Date.now() + product.shelfLifeDays * 86400000)
      : null;

    const lot = await tx.stockLot.upsert({
      where: {
        companyId_itemId_lotNo: { companyId: scope.companyId, itemId: mo.productId, lotNo },
      },
      create: {
        companyId: scope.companyId,
        itemId: mo.productId,
        lotNo,
        manufacturedAt,
        expiresAt,
      },
      update: {},
    });

    await applyStockMovement(tx, {
      companyId: scope.companyId,
      warehouseId: mo.warehouseId,
      itemId: mo.productId,
      lotId: lot.id,
      type: "PRODUCTION_RECEIPT",
      quantity: producedQty,
      unitCost,
      sourceType: "PRODUCTION",
      sourceId: mo.id,
      sourceNo: mo.orderNo,
      operatorId: actor.id,
    });

    await tx.productionOutput.create({
      data: {
        productionId: mo.id,
        itemId: mo.productId,
        quantity: producedQty,
        lotNo,
        manufacturedAt,
        expiresAt,
        unitCost,
      },
    });

    await tx.productionOrder.update({
      where: { id: mo.id },
      data: {
        status: "COMPLETED",
        producedQty,
        totalCost,
        completedAt: new Date(),
      },
    });

    await writeAudit(tx, {
      companyId: scope.companyId,
      userId: actor.id,
      action: "COMPLETE",
      entityType: "ProductionOrder",
      entityId: mo.id,
      after: { producedQty: producedQty.toString(), totalCost: totalCost.toString() },
    });
  });

  revalidatePath(`/dashboard/production/${id}`);
  revalidatePath("/dashboard/inventory");
}
