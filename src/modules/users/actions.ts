"use server";

import { revalidatePath } from "next/cache";
import { RoleName } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requirePermission, companyScope } from "@/lib/permissions";
import { writeAudit } from "@/lib/audit";
import { ForbiddenError, NotFoundError } from "@/lib/errors";

const approveSchema = z.object({
  userId: z.string().min(1),
  role: z.nativeEnum(RoleName),
});

const rejectSchema = z.object({
  userId: z.string().min(1),
  reason: z.string().optional(),
});

export async function approveUserAction(formData: FormData) {
  const actor = await requirePermission("user.approve");
  const { userId, role } = approveSchema.parse({
    userId: formData.get("userId"),
    role: formData.get("role"),
  });

  const scope = companyScope(actor);
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new NotFoundError("找不到使用者");
  if (user.companyId && user.companyId !== scope.companyId) {
    throw new ForbiddenError("無權審核其他公司的帳號");
  }

  const roleRecord = await prisma.role.findUnique({ where: { name: role } });
  if (!roleRecord) throw new NotFoundError("角色不存在");

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: {
        status: "APPROVED",
        approvedAt: new Date(),
        approvedBy: actor.id,
        companyId: user.companyId ?? scope.companyId,
        rejectedAt: null,
        rejectReason: null,
      },
    });
    const existingRole = await tx.userRole.findFirst({
      where: { userId, roleId: roleRecord.id, storeId: null },
    });
    if (!existingRole) {
      await tx.userRole.create({ data: { userId, roleId: roleRecord.id } });
    }
    await writeAudit(tx, {
      companyId: scope.companyId,
      userId: actor.id,
      action: "APPROVE",
      entityType: "User",
      entityId: userId,
      after: { status: "APPROVED", role },
    });
  });

  revalidatePath("/dashboard/review-users");
}

export async function rejectUserAction(formData: FormData) {
  const actor = await requirePermission("user.approve");
  const { userId, reason } = rejectSchema.parse({
    userId: formData.get("userId"),
    reason: formData.get("reason") || undefined,
  });

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new NotFoundError("找不到使用者");

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: { status: "REJECTED", rejectedAt: new Date(), rejectReason: reason ?? null },
    });
    await writeAudit(tx, {
      companyId: actor.companyId,
      userId: actor.id,
      action: "REJECT",
      entityType: "User",
      entityId: userId,
      after: { status: "REJECTED", reason },
    });
  });

  revalidatePath("/dashboard/review-users");
}
