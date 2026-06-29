import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { RoleName } from "@prisma/client";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { authConfig } from "./config";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  secret: env.AUTH_SECRET,
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "密碼", type: "password" },
      },
      async authorize(raw) {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;
        const { email, password } = parsed.data;

        const user = await prisma.user.findUnique({
          where: { email },
          include: {
            userRoles: { include: { role: true } },
            storeUsers: true,
          },
        });

        if (!user || !user.passwordHash) return null;

        // 帳號鎖定
        if (user.lockedUntil && user.lockedUntil > new Date()) {
          throw new Error("帳號已鎖定，請稍後再試");
        }

        // 帳號狀態：未核准不可登入
        if (user.status !== "APPROVED" || !user.isActive) {
          throw new Error("帳號尚未核准或已停用");
        }

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) {
          const nextCount = user.failedLoginCount + 1;
          const shouldLock = nextCount >= env.AUTH_MAX_LOGIN_ATTEMPTS;
          await prisma.user.update({
            where: { id: user.id },
            data: {
              failedLoginCount: nextCount,
              lockedUntil: shouldLock
                ? new Date(Date.now() + env.AUTH_LOCK_MINUTES * 60_000)
                : null,
            },
          });
          return null;
        }

        // 登入成功：重置失敗計數
        await prisma.user.update({
          where: { id: user.id },
          data: { failedLoginCount: 0, lockedUntil: null, lastLoginAt: new Date() },
        });

        const roles = user.userRoles.map((ur) => ur.role.name as RoleName);
        const storeIds = user.storeUsers.map((su) => su.storeId);

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          companyId: user.companyId,
          roles,
          storeIds,
        };
      },
    }),
  ],
});
