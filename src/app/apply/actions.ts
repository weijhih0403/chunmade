"use server";

import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export async function submitApplication(formData: FormData) {
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!username || password.length < 6) {
    return { error: "請填寫帳號，且密碼至少 6 碼。" };
  }

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
    return { error: "此帳號先前已被拒絕，請改用其他帳號名稱重新申請。" };
  }

  await prisma.user.create({
    data: {
      username,
      passwordHash: await bcrypt.hash(password, 12),
      status: "PENDING",
    },
  });
  return { ok: true };
}
