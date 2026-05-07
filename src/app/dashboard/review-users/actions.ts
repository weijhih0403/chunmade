"use server";

import type { UserStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { sendAdminNotification } from "@/lib/mail";
import { prisma } from "@/lib/prisma";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("未登入");
  if (!session.user.isAdmin) throw new Error("無管理權限");
}

async function sendApprovalEmail(opts: {
  approvedUsername: string;
  approverName: string;
}) {
  return sendAdminNotification({
    subject: `員工帳號已審核通過：${opts.approvedUsername}`,
    text: [
      "有新的員工帳號已審核通過。",
      `帳號：${opts.approvedUsername}`,
      `審核人：${opts.approverName}`,
      `時間：${new Date().toLocaleString("zh-TW")}`,
    ].join("\n"),
  });
}

async function sendRejectedEmail(opts: {
  rejectedUsername: string;
  approverName: string;
}) {
  return sendAdminNotification({
    subject: `員工帳號申請已拒絕：${opts.rejectedUsername}`,
    text: [
      "有員工帳號申請已被拒絕，並已從系統移除。",
      `帳號：${opts.rejectedUsername}`,
      `審核人：${opts.approverName}`,
      `時間：${new Date().toLocaleString("zh-TW")}`,
    ].join("\n"),
  });
}

export async function setUserStatus(userId: string, status: UserStatus) {
  const session = await auth();
  await requireAdmin();

  const currentUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, username: true, isAdmin: true },
  });

  if (!currentUser) {
    throw new Error("找不到此帳號");
  }

  if (currentUser.isAdmin) {
    throw new Error("不可修改管理者帳號");
  }

  if (status === "REJECTED") {
    await prisma.user.delete({ where: { id: userId } });
    const mail = await sendRejectedEmail({
      rejectedUsername: currentUser.username,
      approverName: session?.user?.name || "管理者",
    });
    if (mail.status !== "sent") {
      console.warn("[mail] rejection notification not sent:", mail);
    }
    revalidatePath("/dashboard/review-users");
    return;
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      status,
      approvedAt: status === "APPROVED" ? new Date() : null,
    },
    select: { username: true },
  });

  if (status === "APPROVED") {
    const mail = await sendApprovalEmail({
      approvedUsername: updated.username,
      approverName: session?.user?.name || "管理者",
    });
    if (mail.status !== "sent") {
      console.warn("[mail] approval notification not sent:", mail);
    }
  }

  revalidatePath("/dashboard/review-users");
}
