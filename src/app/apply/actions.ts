"use server";

import bcrypt from "bcryptjs";
import { sendAdminNotification } from "@/lib/mail";
import { prisma } from "@/lib/prisma";

async function sendNewApplicationEmail(username: string) {
  return sendAdminNotification({
    subject: `【待審核】新的員工帳號申請：${username}`,
    text: [
      "有新的員工帳號送出申請，請至後台審核。",
      `帳號：${username}`,
      `時間：${new Date().toLocaleString("zh-TW")}`,
      "",
      "審核頁：/dashboard/review-users",
    ].join("\n"),
  });
}

export async function submitApplication(formData: FormData) {
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!username || password.length < 6) {
    return { error: "請填寫帳號，且密碼至少 6 碼。" };
  }

  try {
    const existed = await prisma.user.findUnique({
      where: { username },
      select: { status: true },
    });

    if (existed) {
      if (existed.status === "PENDING") {
        return { error: "此帳號已送出申請，正在等待管理者審核。" };
      }
      if (existed.status === "APPROVED") {
        return { error: "此帳號已核准，請直接到登入頁登入。" };
      }
      return {
        error: "此帳號先前已被拒絕，請改用其他帳號名稱重新申請。",
      };
    }

    await prisma.user.create({
      data: {
        username,
        passwordHash: await bcrypt.hash(password, 12),
        status: "PENDING",
      },
    });

    const mail = await sendNewApplicationEmail(username);
    return {
      ok: true as const,
      mailStatus: mail.status,
      mailDetail:
        mail.status === "failed" ? mail.message : undefined,
    };
  } catch (e) {
    console.error("submitApplication failed:", e);
    return { error: "系統暫時忙碌，請稍後再試。" };
  }
}
