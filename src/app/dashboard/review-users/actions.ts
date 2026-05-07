"use server";

import type { UserStatus } from "@prisma/client";
import nodemailer from "nodemailer";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
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
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) return;

  const port = Number(process.env.SMTP_PORT ?? 587);
  const secure = Number.isFinite(port) && port === 465;

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });

  const to = process.env.APPROVAL_NOTIFY_TO || "weijhih0403@gmail.com";
  const from = process.env.MAIL_FROM || user;

  await transporter.sendMail({
    from,
    to,
    subject: `員工帳號已審核通過：${opts.approvedUsername}`,
    text: [
      "有新的員工帳號已審核通過。",
      `帳號：${opts.approvedUsername}`,
      `審核人：${opts.approverName}`,
      `時間：${new Date().toLocaleString("zh-TW")}`,
    ].join("\n"),
  });
}

export async function setUserStatus(userId: string, status: UserStatus) {
  const session = await auth();
  await requireAdmin();

  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      status,
      approvedAt: status === "APPROVED" ? new Date() : null,
    },
    select: { username: true },
  });

  if (status === "APPROVED") {
    try {
      await sendApprovalEmail({
        approvedUsername: updated.username,
        approverName: session?.user?.name || "管理者",
      });
    } catch (e) {
      console.error("send approval email failed:", e);
    }
  }

  revalidatePath("/dashboard/review-users");
}
