"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requirePermission, companyScope } from "@/lib/permissions";
import { writeAudit } from "@/lib/audit";
import { ConflictError } from "@/lib/errors";
import { type FormState, toFormError } from "@/lib/forms";
import { itemSchema, categorySchema, unitSchema } from "./schemas";

export async function createItemAction(_prev: FormState, formData: FormData): Promise<FormState> {
  try {
    const actor = await requirePermission("catalog.manage");
    const scope = companyScope(actor);
    const data = itemSchema.parse({
      sku: formData.get("sku"),
      barcode: formData.get("barcode") ?? "",
      name: formData.get("name"),
      type: formData.get("type"),
      categoryId: formData.get("categoryId") ?? "",
      baseUnitId: formData.get("baseUnitId"),
      taxType: formData.get("taxType") ?? "TAXABLE",
      price: formData.get("price") ?? "0",
      standardCost: formData.get("standardCost") ?? "0",
      trackStock: formData.get("trackStock") === "on" || formData.get("trackStock") === "true",
      safetyStock: formData.get("safetyStock") ?? "0",
      reorderPoint: formData.get("reorderPoint") ?? "0",
      shelfLifeDays: (formData.get("shelfLifeDays") as string) ?? "",
    });

    const dup = await prisma.item.findUnique({
      where: { companyId_sku: { companyId: scope.companyId, sku: data.sku } },
    });
    if (dup) throw new ConflictError("此 SKU 已存在");

    const item = await prisma.$transaction(async (tx) => {
      const created = await tx.item.create({
        data: {
          companyId: scope.companyId,
          sku: data.sku,
          barcode: data.barcode || null,
          name: data.name,
          type: data.type,
          categoryId: data.categoryId || null,
          baseUnitId: data.baseUnitId,
          taxType: data.taxType,
          price: data.price,
          standardCost: data.standardCost,
          trackStock: data.trackStock,
          safetyStock: data.safetyStock,
          reorderPoint: data.reorderPoint,
          shelfLifeDays: data.shelfLifeDays,
          createdBy: actor.id,
        },
      });
      await writeAudit(tx, {
        companyId: scope.companyId,
        userId: actor.id,
        action: "CREATE",
        entityType: "Item",
        entityId: created.id,
        after: { sku: created.sku, name: created.name, type: created.type },
      });
      return created;
    });

    revalidatePath("/dashboard/items");
    return { ok: true, message: `商品「${item.name}」已建立` };
  } catch (err) {
    return toFormError(err);
  }
}

export async function createCategoryAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  try {
    const actor = await requirePermission("catalog.manage");
    const scope = companyScope(actor);
    const data = categorySchema.parse({
      code: formData.get("code"),
      name: formData.get("name"),
    });
    const dup = await prisma.category.findUnique({
      where: { companyId_code: { companyId: scope.companyId, code: data.code } },
    });
    if (dup) throw new ConflictError("此分類代碼已存在");
    await prisma.category.create({
      data: { companyId: scope.companyId, code: data.code, name: data.name },
    });
    revalidatePath("/dashboard/categories");
    return { ok: true, message: `分類「${data.name}」已建立` };
  } catch (err) {
    return toFormError(err);
  }
}

export async function createUnitAction(_prev: FormState, formData: FormData): Promise<FormState> {
  try {
    const actor = await requirePermission("catalog.manage");
    const scope = companyScope(actor);
    const data = unitSchema.parse({ code: formData.get("code"), name: formData.get("name") });
    const dup = await prisma.unit.findUnique({
      where: { companyId_code: { companyId: scope.companyId, code: data.code } },
    });
    if (dup) throw new ConflictError("此單位代碼已存在");
    await prisma.unit.create({
      data: { companyId: scope.companyId, code: data.code, name: data.name },
    });
    revalidatePath("/dashboard/units");
    return { ok: true, message: `單位「${data.name}」已建立` };
  } catch (err) {
    return toFormError(err);
  }
}
