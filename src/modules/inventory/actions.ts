"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requirePermission, companyScope } from "@/lib/permissions";
import { writeAudit } from "@/lib/audit";
import { BusinessRuleError } from "@/lib/errors";
import { type FormState, toFormError } from "@/lib/forms";
import { applyStockMovement } from "@/server/services/stock";
import { nextDocumentNo } from "@/server/services/sequence";
import { toDecimal } from "@/lib/money";

const adjustSchema = z.object({
  warehouseId: z.string().min(1, "請選擇倉庫"),
  itemId: z.string().min(1, "請選擇商品"),
  mode: z.enum(["IN", "OUT"]),
  quantity: z.coerce.number().positive("數量需大於 0"),
  reason: z.string().optional(),
});

export async function adjustStockAction(_prev: FormState, formData: FormData): Promise<FormState> {
  try {
    const actor = await requirePermission("inventory.adjust");
    const scope = companyScope(actor);
    const data = adjustSchema.parse({
      warehouseId: formData.get("warehouseId"),
      itemId: formData.get("itemId"),
      mode: formData.get("mode"),
      quantity: formData.get("quantity"),
      reason: formData.get("reason") || undefined,
    });

    await prisma.$transaction(async (tx) => {
      const result = await applyStockMovement(tx, {
        companyId: scope.companyId,
        warehouseId: data.warehouseId,
        itemId: data.itemId,
        type: data.mode === "IN" ? "ADJUSTMENT_IN" : "ADJUSTMENT_OUT",
        quantity: data.quantity,
        reason: data.reason ?? "庫存調整",
        sourceType: "ADJUSTMENT",
        operatorId: actor.id,
      });
      await writeAudit(tx, {
        companyId: scope.companyId,
        userId: actor.id,
        action: "ADJUST",
        entityType: "StockMovement",
        entityId: result.movement.id,
        after: {
          mode: data.mode,
          quantity: data.quantity,
          before: result.quantityBefore.toString(),
          after: result.quantityAfter.toString(),
        },
      });
    });

    revalidatePath("/dashboard/inventory");
    return { ok: true, message: "庫存調整完成" };
  } catch (err) {
    return toFormError(err);
  }
}

const wasteSchema = z.object({
  warehouseId: z.string().min(1, "請選擇倉庫"),
  itemId: z.string().min(1, "請選擇商品"),
  quantity: z.coerce.number().positive("數量需大於 0"),
  reason: z.string().min(1, "請輸入報廢原因"),
});

export async function wasteAction(_prev: FormState, formData: FormData): Promise<FormState> {
  try {
    const actor = await requirePermission("inventory.waste");
    const scope = companyScope(actor);
    const data = wasteSchema.parse({
      warehouseId: formData.get("warehouseId"),
      itemId: formData.get("itemId"),
      quantity: formData.get("quantity"),
      reason: formData.get("reason"),
    });

    await prisma.$transaction(async (tx) => {
      const wasteNo = await nextDocumentNo(tx, scope.companyId, "WASTE");
      const result = await applyStockMovement(tx, {
        companyId: scope.companyId,
        warehouseId: data.warehouseId,
        itemId: data.itemId,
        type: "WASTE",
        quantity: data.quantity,
        reason: data.reason,
        sourceType: "WASTE",
        sourceNo: wasteNo,
        operatorId: actor.id,
      });
      await tx.wasteRecord.create({
        data: {
          companyId: scope.companyId,
          wasteNo,
          warehouseId: data.warehouseId,
          itemId: data.itemId,
          quantity: toDecimal(data.quantity),
          reason: data.reason,
          createdBy: actor.id,
        },
      });
      await writeAudit(tx, {
        companyId: scope.companyId,
        userId: actor.id,
        action: "WASTE",
        entityType: "WasteRecord",
        entityId: result.movement.id,
        after: { wasteNo, quantity: data.quantity, reason: data.reason },
      });
    });

    revalidatePath("/dashboard/inventory");
    return { ok: true, message: "報廢完成" };
  } catch (err) {
    return toFormError(err);
  }
}

const transferSchema = z.object({
  fromWarehouseId: z.string().min(1),
  toWarehouseId: z.string().min(1),
  itemId: z.string().min(1),
  quantity: z.coerce.number().positive("數量需大於 0"),
});

export async function transferAction(_prev: FormState, formData: FormData): Promise<FormState> {
  try {
    const actor = await requirePermission("inventory.transfer");
    const scope = companyScope(actor);
    const data = transferSchema.parse({
      fromWarehouseId: formData.get("fromWarehouseId"),
      toWarehouseId: formData.get("toWarehouseId"),
      itemId: formData.get("itemId"),
      quantity: formData.get("quantity"),
    });
    if (data.fromWarehouseId === data.toWarehouseId) {
      throw new BusinessRuleError("來源與目的倉庫不可相同");
    }

    await prisma.$transaction(async (tx) => {
      const transferNo = await nextDocumentNo(tx, scope.companyId, "STOCK_TRANSFER");

      const [fromWh, toWh] = await Promise.all([
        tx.warehouse.findFirst({
          where: { ...scope, id: data.fromWarehouseId },
          include: { store: { select: { id: true } } },
        }),
        tx.warehouse.findFirst({
          where: { ...scope, id: data.toWarehouseId },
          include: { store: { select: { id: true } } },
        }),
      ]);
      if (!fromWh || !toWh) throw new BusinessRuleError("倉庫不存在");

      const transfer = await tx.stockTransfer.create({
        data: {
          companyId: scope.companyId,
          transferNo,
          fromWarehouseId: data.fromWarehouseId,
          toWarehouseId: data.toWarehouseId,
          status: "COMPLETED",
          completedAt: new Date(),
          createdBy: actor.id,
          items: { create: [{ itemId: data.itemId, quantity: toDecimal(data.quantity) }] },
        },
      });
      // 取出庫成本作為入庫成本
      const out = await applyStockMovement(tx, {
        companyId: scope.companyId,
        warehouseId: data.fromWarehouseId,
        itemId: data.itemId,
        type: "TRANSFER_OUT",
        quantity: data.quantity,
        sourceType: "TRANSFER",
        sourceId: transfer.id,
        sourceNo: transferNo,
        operatorId: actor.id,
      });

      const unitCost = out.avgCost;
      const settlementAmount = unitCost.mul(data.quantity);
      const fromStoreId = fromWh.store?.id ?? null;
      const toStoreId = toWh.store?.id ?? null;

      let collectFromStoreId: string | null = null;
      let payToStoreId: string | null = null;
      let settlementStatus: "PENDING" | "WAIVED" = "WAIVED";

      if (fromStoreId && toStoreId && fromStoreId !== toStoreId && settlementAmount.greaterThan(0)) {
        collectFromStoreId = toStoreId;
        payToStoreId = fromStoreId;
        settlementStatus = "PENDING";
      }

      await tx.stockTransferItem.updateMany({
        where: { transferId: transfer.id },
        data: { unitCost } as { unitCost: typeof unitCost },
      });
      await tx.stockTransfer.update({
        where: { id: transfer.id },
        data: {
          settlementAmount,
          collectFromStoreId,
          payToStoreId,
          settlementStatus,
        } as {
          settlementAmount: typeof settlementAmount;
          collectFromStoreId: string | null;
          payToStoreId: string | null;
          settlementStatus: typeof settlementStatus;
        },
      });

      await applyStockMovement(tx, {
        companyId: scope.companyId,
        warehouseId: data.toWarehouseId,
        itemId: data.itemId,
        type: "TRANSFER_IN",
        quantity: data.quantity,
        unitCost: out.avgCost,
        sourceType: "TRANSFER",
        sourceId: transfer.id,
        sourceNo: transferNo,
        operatorId: actor.id,
      });
      await writeAudit(tx, {
        companyId: scope.companyId,
        userId: actor.id,
        action: "TRANSFER",
        entityType: "StockTransfer",
        entityId: transfer.id,
        after: { transferNo, quantity: data.quantity },
      });
    });

    revalidatePath("/dashboard/transfers");
    revalidatePath("/dashboard/inventory");
    return { ok: true, message: "調撥完成" };
  } catch (err) {
    return toFormError(err);
  }
}

const settlementSchema = z.object({
  transferId: z.string().min(1),
  settlementStatus: z.enum(["PENDING", "COLLECTED", "PAID", "WAIVED"]),
  collectFromStoreId: z.string().optional().or(z.literal("")),
  payToStoreId: z.string().optional().or(z.literal("")),
  settlementNote: z.string().optional(),
});

export async function updateTransferSettlementAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  try {
    const actor = await requirePermission("inventory.transfer");
    const scope = companyScope(actor);
    const data = settlementSchema.parse({
      transferId: formData.get("transferId"),
      settlementStatus: formData.get("settlementStatus"),
      collectFromStoreId: formData.get("collectFromStoreId") ?? "",
      payToStoreId: formData.get("payToStoreId") ?? "",
      settlementNote: (formData.get("settlementNote") as string) || undefined,
    });

    const transfer = await prisma.stockTransfer.findFirst({
      where: { ...scope, id: data.transferId, deletedAt: null },
    });
    if (!transfer) throw new BusinessRuleError("找不到調撥單");

    const settled =
      data.settlementStatus === "COLLECTED" ||
      data.settlementStatus === "PAID" ||
      data.settlementStatus === "WAIVED";

    await prisma.stockTransfer.update({
      where: { id: data.transferId },
      data: {
        settlementStatus: data.settlementStatus,
        collectFromStoreId: data.collectFromStoreId || null,
        payToStoreId: data.payToStoreId || null,
        settlementNote: data.settlementNote || null,
        settledAt: settled ? new Date() : null,
      } as {
        settlementStatus: typeof data.settlementStatus;
        collectFromStoreId: string | null;
        payToStoreId: string | null;
        settlementNote: string | null;
        settledAt: Date | null;
      },
    });

    revalidatePath("/dashboard/transfers");
    return { ok: true, message: "貨款狀態已更新" };
  } catch (err) {
    return toFormError(err);
  }
}
