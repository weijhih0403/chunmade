"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requirePermission, companyScope } from "@/lib/permissions";
import { writeAudit } from "@/lib/audit";
import { BusinessRuleError, ConflictError, NotFoundError } from "@/lib/errors";
import { type FormState, toFormError } from "@/lib/forms";
import { add, mul, toDecimal, ZERO, gte } from "@/lib/money";
import { assertTransition, PURCHASE_ORDER_TRANSITIONS } from "@/lib/state-machine";
import { nextDocumentNo } from "@/server/services/sequence";
import { applyStockMovement } from "@/server/services/stock";
import { supplierSchema, purchaseOrderSchema } from "./schemas";

export async function createSupplierAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  try {
    const actor = await requirePermission("purchase.manage");
    const scope = companyScope(actor);
    const data = supplierSchema.parse({
      code: formData.get("code"),
      name: formData.get("name"),
      contact: formData.get("contact") ?? "",
      phone: formData.get("phone") ?? "",
      email: formData.get("email") ?? "",
    });
    const dup = await prisma.supplier.findUnique({
      where: { companyId_code: { companyId: scope.companyId, code: data.code } },
    });
    if (dup) throw new ConflictError("此供應商代碼已存在");
    await prisma.supplier.create({
      data: {
        companyId: scope.companyId,
        code: data.code,
        name: data.name,
        contact: data.contact || null,
        phone: data.phone || null,
        email: data.email || null,
      },
    });
    revalidatePath("/dashboard/suppliers");
    return { ok: true, message: `供應商「${data.name}」已建立` };
  } catch (err) {
    return toFormError(err);
  }
}

/** 刪除供應商：軟刪除（既有採購單仍保留參照） */
export async function deleteSupplierAction(formData: FormData) {
  const actor = await requirePermission("purchase.manage");
  const scope = companyScope(actor);
  const id = String(formData.get("supplierId") ?? "");

  const supplier = await prisma.supplier.findFirst({
    where: { ...scope, id, deletedAt: null },
  });
  if (!supplier) throw new NotFoundError("找不到供應商");

  await prisma.$transaction(async (tx) => {
    await tx.supplier.update({
      where: { id: supplier.id },
      data: { deletedAt: new Date(), isActive: false },
    });
    await writeAudit(tx, {
      companyId: scope.companyId,
      userId: actor.id,
      action: "DELETE",
      entityType: "Supplier",
      entityId: supplier.id,
      before: { code: supplier.code, name: supplier.name },
    });
  });

  revalidatePath("/dashboard/suppliers");
}

export async function createPurchaseOrderAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  try {
    const actor = await requirePermission("purchase.manage");
    const scope = companyScope(actor);
    const linesRaw = JSON.parse(String(formData.get("lines") ?? "[]"));
    const data = purchaseOrderSchema.parse({
      supplierId: formData.get("supplierId"),
      warehouseId: formData.get("warehouseId"),
      expectedDate: formData.get("expectedDate") ?? "",
      note: formData.get("note") ?? "",
      lines: linesRaw,
    });

    let subtotal = ZERO;
    const lineData = data.lines.map((l) => {
      const lineTotal = mul(l.quantity, l.unitPrice);
      subtotal = add(subtotal, lineTotal);
      return {
        itemId: l.itemId,
        quantity: toDecimal(l.quantity),
        unitPrice: toDecimal(l.unitPrice),
        lineTotal,
      };
    });

    const po = await prisma.$transaction(async (tx) => {
      const orderNo = await nextDocumentNo(tx, scope.companyId, "PURCHASE_ORDER");
      const created = await tx.purchaseOrder.create({
        data: {
          companyId: scope.companyId,
          warehouseId: data.warehouseId,
          orderNo,
          supplierId: data.supplierId,
          status: "DRAFT",
          expectedDate: data.expectedDate ? new Date(data.expectedDate) : null,
          subtotal,
          taxAmount: ZERO,
          total: subtotal,
          note: data.note || null,
          createdBy: actor.id,
          items: { create: lineData },
        },
      });
      await writeAudit(tx, {
        companyId: scope.companyId,
        userId: actor.id,
        action: "CREATE",
        entityType: "PurchaseOrder",
        entityId: created.id,
        after: { orderNo, total: subtotal.toString() },
      });
      return created;
    });

    revalidatePath("/dashboard/purchases");
    return { ok: true, message: `採購單 ${po.orderNo} 已建立` };
  } catch (err) {
    return toFormError(err);
  }
}

async function changePoStatus(
  id: string,
  to: "PENDING_APPROVAL" | "APPROVED" | "CANCELLED",
  permission: "purchase.manage" | "purchase.approve",
) {
  const actor = await requirePermission(permission);
  const scope = companyScope(actor);
  const po = await prisma.purchaseOrder.findFirst({ where: { ...scope, id } });
  if (!po) throw new NotFoundError("找不到採購單");
  assertTransition(PURCHASE_ORDER_TRANSITIONS, po.status, to, "採購單");

  await prisma.$transaction(async (tx) => {
    await tx.purchaseOrder.update({
      where: { id },
      data: {
        status: to,
        ...(to === "APPROVED" ? { approvedBy: actor.id, approvedAt: new Date() } : {}),
      },
    });
    await writeAudit(tx, {
      companyId: scope.companyId,
      userId: actor.id,
      action: to,
      entityType: "PurchaseOrder",
      entityId: id,
      before: { status: po.status },
      after: { status: to },
    });
  });
  revalidatePath(`/dashboard/purchases/${id}`);
  revalidatePath("/dashboard/purchases");
}

export async function submitPurchaseOrderAction(formData: FormData) {
  await changePoStatus(String(formData.get("id")), "PENDING_APPROVAL", "purchase.manage");
}

export async function approvePurchaseOrderAction(formData: FormData) {
  await changePoStatus(String(formData.get("id")), "APPROVED", "purchase.approve");
}

export async function cancelPurchaseOrderAction(formData: FormData) {
  await changePoStatus(String(formData.get("id")), "CANCELLED", "purchase.manage");
}

/** 驗收入庫：依輸入收貨數量產生入庫異動並更新採購單 */
export async function receiveGoodsAction(formData: FormData) {
  const actor = await requirePermission("purchase.receive");
  const scope = companyScope(actor);
  const id = String(formData.get("orderId"));

  const po = await prisma.purchaseOrder.findFirst({
    where: { ...scope, id },
    include: { items: true },
  });
  if (!po) throw new NotFoundError("找不到採購單");
  if (po.status !== "APPROVED" && po.status !== "PARTIALLY_RECEIVED") {
    throw new BusinessRuleError("採購單需為已核准或部分收貨才能驗收");
  }

  await prisma.$transaction(async (tx) => {
    const receiptNo = await nextDocumentNo(tx, scope.companyId, "GOODS_RECEIPT");
    const receiptItems: {
      orderItemId: string;
      itemId: string;
      quantity: ReturnType<typeof toDecimal>;
      unitCost: ReturnType<typeof toDecimal>;
      lotNo: string | null;
    }[] = [];

    let anyReceived = false;
    let allReceived = true;

    for (const line of po.items) {
      const recvRaw = formData.get(`recv_${line.id}`);
      const recvQty = toDecimal(recvRaw != null && recvRaw !== "" ? String(recvRaw) : "0");
      const lotNo = (formData.get(`lot_${line.id}`) as string) || null;
      const remaining = toDecimal(line.quantity).sub(line.receivedQty);

      if (recvQty.greaterThan(0)) {
        if (recvQty.greaterThan(remaining)) {
          throw new BusinessRuleError(`收貨數量超過未收量（剩餘 ${remaining.toString()}）`);
        }
        anyReceived = true;

        let lotId: string | null = null;
        if (lotNo) {
          const lot = await tx.stockLot.upsert({
            where: {
              companyId_itemId_lotNo: {
                companyId: scope.companyId,
                itemId: line.itemId,
                lotNo,
              },
            },
            create: { companyId: scope.companyId, itemId: line.itemId, lotNo },
            update: {},
          });
          lotId = lot.id;
        }

        await applyStockMovement(tx, {
          companyId: scope.companyId,
          warehouseId: po.warehouseId,
          itemId: line.itemId,
          lotId,
          type: "PURCHASE_RECEIPT",
          quantity: recvQty,
          unitCost: line.unitPrice,
          sourceType: "PURCHASE",
          sourceId: po.id,
          sourceNo: receiptNo,
          operatorId: actor.id,
        });

        await tx.purchaseOrderItem.update({
          where: { id: line.id },
          data: { receivedQty: add(line.receivedQty, recvQty) },
        });

        receiptItems.push({
          orderItemId: line.id,
          itemId: line.itemId,
          quantity: recvQty,
          unitCost: toDecimal(line.unitPrice),
          lotNo,
        });
      }

      const newReceived = add(line.receivedQty, recvQty);
      if (!gte(newReceived, line.quantity)) allReceived = false;
    }

    if (!anyReceived) throw new BusinessRuleError("請至少輸入一筆收貨數量");

    await tx.goodsReceipt.create({
      data: {
        companyId: scope.companyId,
        warehouseId: po.warehouseId,
        receiptNo,
        orderId: po.id,
        createdBy: actor.id,
        items: { create: receiptItems },
      },
    });

    await tx.purchaseOrder.update({
      where: { id: po.id },
      data: { status: allReceived ? "RECEIVED" : "PARTIALLY_RECEIVED" },
    });

    await writeAudit(tx, {
      companyId: scope.companyId,
      userId: actor.id,
      action: "RECEIVE",
      entityType: "PurchaseOrder",
      entityId: po.id,
      after: { receiptNo, allReceived },
    });
  });

  revalidatePath(`/dashboard/purchases/${id}`);
  revalidatePath("/dashboard/inventory");
}
