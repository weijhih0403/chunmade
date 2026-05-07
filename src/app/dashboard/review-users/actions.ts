"use server";

import type { UserStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("未登入");
  if (!session.user.isAdmin) throw new Error("無管理權限");
}

export async function setUserStatus(userId: string, status: UserStatus) {
  await requireAdmin();

  await prisma.user.update({
    where: { id: userId },
    data: {
      status,
      approvedAt: status === "APPROVED" ? new Date() : null,
    },
  });

  revalidatePath("/dashboard/review-users");
}
