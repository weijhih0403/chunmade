"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requirePermission, companyScope } from "@/lib/permissions";
import { NotFoundError } from "@/lib/errors";
import { buildPickupLabel } from "@/lib/print/tspl";

/** 補印出單標籤 */
export async function reprintOrderLabelAction(formData: FormData) {
  const actor = await requirePermission("print.operate");
  const scope = companyScope(actor);
  const orderId = String(formData.get("orderId"));

  const order = await prisma.salesOrder.findFirst({
    where: { ...scope, id: orderId },
    include: { items: true },
  });
  if (!order) throw new NotFoundError("找不到訂單");

  const store = await prisma.store.findUnique({ where: { id: order.storeId } });
  const payload = buildPickupLabel({
    storeName: store?.name ?? "",
    orderNo: order.orderNo,
    items: order.items.map((i) => ({ name: i.name, quantity: Number(i.quantity) })),
  });

  await prisma.printJob.create({
    data: {
      companyId: scope.companyId,
      storeId: order.storeId,
      orderId: order.id,
      status: "PENDING",
      payload,
    },
  });

  revalidatePath(`/dashboard/sales/${orderId}`);
}
