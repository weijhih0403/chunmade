"use server";

import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export async function submitApplication(formData: FormData) {
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!username || password.length < 6) {
    return { error: "請填寫帳號，且密碼至少 6 碼。" };
  }

  try {
    await prisma.user.create({
      data: {
        username,
        passwordHash: await bcrypt.hash(password, 12),
        status: "PENDING",
      },
    });
    return { ok: true };
  } catch {
    return { error: "帳號已存在，請換一個帳號名稱。" };
  }
}
