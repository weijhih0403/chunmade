"use server";

import bcrypt from "bcryptjs";
import { AuthError } from "next-auth";
import { signIn } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { writeAudit } from "@/lib/audit";
import { applySchema, loginSchema } from "./schemas";

export type ActionState = {
  ok: boolean;
  message: string | null;
  fieldErrors?: Record<string, string[]>;
};

export async function loginAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { ok: false, message: null, fieldErrors: parsed.error.flatten().fieldErrors };
  }

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: "/dashboard",
    });
    return { ok: true, message: null };
  } catch (error) {
    if (error instanceof AuthError) {
      return { ok: false, message: "登入失敗：帳號或密碼錯誤，或帳號尚未核准 / 已鎖定" };
    }
    // NEXT_REDIRECT 例外需重新拋出讓 Next.js 處理導向
    throw error;
  }
}

export async function applyAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = applySchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone") || undefined,
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) {
    return { ok: false, message: null, fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (existing) {
    return { ok: false, message: "此 Email 已被申請或註冊" };
  }

  // 預設掛在第一間啟用中的公司（單一公司情境）
  const company = await prisma.company.findFirst({ where: { isActive: true } });
  const passwordHash = await bcrypt.hash(parsed.data.password, 10);

  const user = await prisma.user.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      passwordHash,
      companyId: company?.id ?? null,
      status: "PENDING",
    },
  });

  await writeAudit(prisma, {
    companyId: company?.id ?? null,
    userId: user.id,
    action: "APPLY",
    entityType: "User",
    entityId: user.id,
    after: { email: user.email, name: user.name, status: user.status },
  });

  return {
    ok: true,
    message: "申請已送出，請等待管理員審核核准後即可登入。",
  };
}
