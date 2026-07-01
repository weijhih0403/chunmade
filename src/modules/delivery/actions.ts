"use server";

import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { startOfBusinessDay } from "@/lib/dates";
import { writeAudit } from "@/lib/audit";
import { ConflictError, NotFoundError } from "@/lib/errors";
import { type FormState, toFormError } from "@/lib/forms";
import {
  assertStoreAccess,
  companyScope,
  requirePermission,
} from "@/lib/permissions";
import { nextDocumentNo } from "@/server/services/sequence";
import { ensureDeliveryFromYesterdayCount } from "./generate-from-count";
import { addDeliveryItemsSchema, createDeliveryNoteSchema } from "./schemas";

function parseLines(raw: string) {
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return [];
  }
}

async function syncNoteStatus(tx: Prisma.TransactionClient, deliveryId: string) {
  const items = await tx.deliveryNoteItem.findMany({ where: { deliveryId } });
  const allDone = items.length > 0 && items.every((i) => i.isDelivered);
  if (allDone) {
    await tx.deliveryNote.update({
      where: { id: deliveryId },
      data: { status: "COMPLETED", completedAt: new Date() },
    });
  } else {
    await tx.deliveryNote.update({
      where: { id: deliveryId },
      data: { status: "IN_PROGRESS", completedAt: null },
    });
  }
}

export async function createDeliveryNoteAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  try {
    const actor = await requirePermission("delivery.manage");
    const scope = companyScope(actor);
    const data = createDeliveryNoteSchema.parse({
      storeId: formData.get("storeId"),
      deliveryDate: (formData.get("deliveryDate") as string) || undefined,
      note: (formData.get("note") as string) || undefined,
      lines: parseLines(String(formData.get("lines") ?? "[]")),
    });

    assertStoreAccess(actor, data.storeId);
    const deliveryDate = data.deliveryDate
      ? startOfBusinessDay(new Date(data.deliveryDate))
      : startOfBusinessDay();

    const existing = await prisma.deliveryNote.findFirst({
      where: {
        ...scope,
        storeId: data.storeId,
        deliveryDate,
        deletedAt: null,
      },
    });
    if (existing) {
      throw new ConflictError("此門市今日已有送貨單，請直接編輯既有單據");
    }

    const note = await prisma.$transaction(async (tx) => {
      const deliveryNo = await nextDocumentNo(tx, scope.companyId, "DELIVERY_NOTE");
      const created = await tx.deliveryNote.create({
        data: {
          companyId: scope.companyId,
          storeId: data.storeId,
          deliveryNo,
          deliveryDate,
          note: data.note || null,
          createdBy: actor.id,
          items: {
            create: data.lines.map((line, idx) => ({
              itemId: line.itemId,
              quantity: line.quantity,
              note: line.note || null,
              sortOrder: idx,
            })),
          },
        },
      });
      await writeAudit(tx, {
        companyId: scope.companyId,
        userId: actor.id,
        action: "CREATE",
        entityType: "DeliveryNote",
        entityId: created.id,
        after: { deliveryNo, storeId: data.storeId },
      });
      return created;
    });

    revalidatePath("/dashboard/deliveries");
    return { ok: true, message: `送貨單 ${note.deliveryNo} 已建立` };
  } catch (err) {
    return toFormError(err);
  }
}

export async function addDeliveryItemsAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  try {
    const actor = await requirePermission("delivery.manage");
    const scope = companyScope(actor);
    const data = addDeliveryItemsSchema.parse({
      deliveryId: formData.get("deliveryId"),
      lines: parseLines(String(formData.get("lines") ?? "[]")),
    });

    const note = await prisma.deliveryNote.findFirst({
      where: { ...scope, id: data.deliveryId, deletedAt: null },
      include: { items: true },
    });
    if (!note) throw new NotFoundError("找不到送貨單");
    if (note.status === "COMPLETED") throw new ConflictError("送貨單已完成，無法新增品項");
    assertStoreAccess(actor, note.storeId);

    const baseOrder = note.items.length;
    await prisma.deliveryNoteItem.createMany({
      data: data.lines.map((line, idx) => ({
        deliveryId: note.id,
        itemId: line.itemId,
        quantity: line.quantity,
        note: line.note || null,
        sortOrder: baseOrder + idx,
      })),
    });

    revalidatePath("/dashboard/deliveries");
    revalidatePath(`/dashboard/deliveries/${note.id}`);
    return { ok: true, message: "品項已新增" };
  } catch (err) {
    return toFormError(err);
  }
}

export async function toggleDeliveryItemAction(lineId: string): Promise<{ ok: boolean }> {
  const actor = await requirePermission("delivery.confirm");
  const scope = companyScope(actor);

  const line = await prisma.deliveryNoteItem.findFirst({
    where: { id: lineId, delivery: { ...scope, deletedAt: null } },
    include: { delivery: true },
  });
  if (!line) throw new NotFoundError("找不到品項");
  if (line.delivery.status === "CANCELLED") throw new ConflictError("送貨單已取消");
  assertStoreAccess(actor, line.delivery.storeId);

  const nextDelivered = !line.isDelivered;
  await prisma.$transaction(async (tx) => {
    await tx.deliveryNoteItem.update({
      where: { id: lineId },
      data: {
        isDelivered: nextDelivered,
        deliveredAt: nextDelivered ? new Date() : null,
        deliveredBy: nextDelivered ? actor.id : null,
      },
    });
    await syncNoteStatus(tx, line.deliveryId);
  });

  revalidatePath("/dashboard/deliveries");
  revalidatePath(`/dashboard/deliveries/${line.deliveryId}`);
  return { ok: true };
}

export async function resetDeliveryNoteAction(formData: FormData) {
  const actor = await requirePermission("delivery.manage");
  const scope = companyScope(actor);
  const id = String(formData.get("deliveryId") ?? "");

  const note = await prisma.deliveryNote.findFirst({
    where: { ...scope, id, deletedAt: null },
  });
  if (!note) throw new NotFoundError("找不到送貨單");
  assertStoreAccess(actor, note.storeId);

  await prisma.$transaction(async (tx) => {
    await tx.deliveryNoteItem.updateMany({
      where: { deliveryId: id },
      data: { isDelivered: false, deliveredAt: null, deliveredBy: null },
    });
    await tx.deliveryNote.update({
      where: { id },
      data: { status: "IN_PROGRESS", completedAt: null },
    });
  });

  revalidatePath("/dashboard/deliveries");
  revalidatePath(`/dashboard/deliveries/${id}`);
}

export async function generateDeliveryFromCountAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  try {
    const actor = await requirePermission("delivery.manage");
    const storeId = String(formData.get("storeId") ?? "");
    if (!storeId) throw new ConflictError("請指定門市");

    const result = await ensureDeliveryFromYesterdayCount(actor, storeId);
    revalidatePath("/dashboard/deliveries");

    if (!result.ok) {
      return { ok: false, message: result.reason };
    }
    if (result.created) {
      return {
        ok: true,
        message: `已依昨日盤點產生送貨單 ${result.deliveryNo}（${result.itemCount} 項）`,
      };
    }
    switch (result.reason) {
      case "exists":
        return { ok: true, message: "今日送貨單已存在" };
      case "no_warehouse":
        return { ok: false, message: "此門市尚未設定倉庫，無法對應盤點資料" };
      case "no_count":
        return { ok: false, message: "昨日尚無完成的盤點單" };
      case "no_order":
        return { ok: false, message: "昨日盤點沒有叫貨項目（要叫的貨皆為 0）" };
      default:
        return { ok: false, message: "無法產生送貨單" };
    }
  } catch (err) {
    return toFormError(err);
  }
}
