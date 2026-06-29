"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requirePermission, companyScope } from "@/lib/permissions";
import { writeAudit } from "@/lib/audit";
import { BusinessRuleError, NotFoundError } from "@/lib/errors";
import { type FormState, toFormError } from "@/lib/forms";
import { add, toDecimal } from "@/lib/money";

const customerSchema = z.object({
  name: z.string().min(1, "請輸入姓名"),
  phone: z.string().optional().or(z.literal("")),
  email: z.string().email("Email 格式錯誤").optional().or(z.literal("")),
  asMember: z.coerce.boolean().default(false),
});

export async function createCustomerAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  try {
    const actor = await requirePermission("customer.manage");
    const scope = companyScope(actor);
    const data = customerSchema.parse({
      name: formData.get("name"),
      phone: formData.get("phone") ?? "",
      email: formData.get("email") ?? "",
      asMember: formData.get("asMember") === "on",
    });

    await prisma.$transaction(async (tx) => {
      const customer = await tx.customer.create({
        data: {
          companyId: scope.companyId,
          name: data.name,
          phone: data.phone || null,
          email: data.email || null,
        },
      });
      if (data.asMember) {
        const count = await tx.member.count({ where: { companyId: scope.companyId } });
        const memberNo = `M${String(count + 1).padStart(5, "0")}`;
        await tx.member.create({
          data: { companyId: scope.companyId, customerId: customer.id, memberNo },
        });
      }
      await writeAudit(tx, {
        companyId: scope.companyId,
        userId: actor.id,
        action: "CREATE",
        entityType: "Customer",
        entityId: customer.id,
        after: { name: data.name, member: data.asMember },
      });
    });

    revalidatePath("/dashboard/customers");
    return { ok: true, message: `客戶「${data.name}」已建立` };
  } catch (err) {
    return toFormError(err);
  }
}

const pointsSchema = z.object({
  customerId: z.string().min(1),
  points: z.coerce.number().int(),
  note: z.string().optional(),
});

export async function adjustPointsAction(formData: FormData) {
  const actor = await requirePermission("customer.manage");
  const scope = companyScope(actor);
  const data = pointsSchema.parse({
    customerId: formData.get("customerId"),
    points: formData.get("points"),
    note: formData.get("note") || undefined,
  });

  await prisma.$transaction(async (tx) => {
    const member = await tx.member.findFirst({
      where: { companyId: scope.companyId, customerId: data.customerId },
    });
    if (!member) throw new NotFoundError("此客戶不是會員");
    const balanceAfter = member.points + data.points;
    if (balanceAfter < 0) throw new BusinessRuleError("點數不足");
    await tx.member.update({ where: { id: member.id }, data: { points: balanceAfter } });
    await tx.loyaltyTransaction.create({
      data: {
        companyId: scope.companyId,
        memberId: member.id,
        type: "ADJUST",
        points: data.points,
        balanceAfter,
        note: data.note ?? null,
        createdBy: actor.id,
      },
    });
    await writeAudit(tx, {
      companyId: scope.companyId,
      userId: actor.id,
      action: "ADJUST_POINTS",
      entityType: "Member",
      entityId: member.id,
      after: { points: data.points, balanceAfter },
    });
  });

  revalidatePath(`/dashboard/customers/${data.customerId}`);
}

const topUpSchema = z.object({
  customerId: z.string().min(1),
  amount: z.coerce.number().positive("儲值金額需大於 0"),
});

export async function topUpStoredValueAction(formData: FormData) {
  const actor = await requirePermission("customer.manage");
  const scope = companyScope(actor);
  const data = topUpSchema.parse({
    customerId: formData.get("customerId"),
    amount: formData.get("amount"),
  });

  await prisma.$transaction(async (tx) => {
    const member = await tx.member.findFirst({
      where: { companyId: scope.companyId, customerId: data.customerId },
    });
    if (!member) throw new NotFoundError("此客戶不是會員");
    const balanceAfter = add(member.storedValue, data.amount);
    await tx.member.update({ where: { id: member.id }, data: { storedValue: balanceAfter } });
    await tx.storedValueTransaction.create({
      data: {
        companyId: scope.companyId,
        memberId: member.id,
        type: "TOPUP",
        amount: toDecimal(data.amount),
        balanceAfter,
        createdBy: actor.id,
      },
    });
    await writeAudit(tx, {
      companyId: scope.companyId,
      userId: actor.id,
      action: "TOPUP",
      entityType: "Member",
      entityId: member.id,
      after: { amount: data.amount, balanceAfter: balanceAfter.toString() },
    });
  });

  revalidatePath(`/dashboard/customers/${data.customerId}`);
}
