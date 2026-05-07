"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

async function requireSession() {
  const session = await auth();
  if (!session?.user) throw new Error("未登入");
}

export async function createInventoryItem(formData: FormData) {
  await requireSession();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "請輸入品項名稱" };

  const quantity = Number(formData.get("quantity") ?? 0);
  const unit = String(formData.get("unit") ?? "件").trim() || "件";
  const notes = String(formData.get("notes") ?? "").trim();

  await prisma.inventoryItem.create({
    data: {
      name,
      quantity: Number.isFinite(quantity) ? Math.max(0, Math.floor(quantity)) : 0,
      unit,
      notes,
    },
  });

  revalidatePath("/dashboard/inventory");
  return { ok: true };
}

export async function updateInventoryItem(id: string, formData: FormData) {
  await requireSession();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;

  const quantityRaw = Number(formData.get("quantity"));
  const quantity = Number.isFinite(quantityRaw)
    ? Math.max(0, Math.floor(quantityRaw))
    : 0;
  const unit = String(formData.get("unit") ?? "件").trim() || "件";
  const notes = String(formData.get("notes") ?? "").trim();

  await prisma.inventoryItem.update({
    where: { id },
    data: { name, quantity, unit, notes },
  });
  revalidatePath("/dashboard/inventory");
}

export async function deleteInventoryItem(id: string) {
  await requireSession();
  await prisma.inventoryItem.delete({ where: { id } });
  revalidatePath("/dashboard/inventory");
}
