import type { NextAuthConfig } from "next-auth";
import { RoleName } from "@prisma/client";

/**
 * Edge 安全設定（供 middleware 使用，不可匯入 Prisma / bcrypt）。
 * 實際的 Credentials provider 與資料庫查詢在 src/lib/auth/index.ts。
 */
export const authConfig = {
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 8, // 8 小時
  },
  trustHost: true,
  callbacks: {
    authorized({ auth }) {
      return !!auth?.user;
    },
    jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.companyId = (user.companyId ?? null) as string | null;
        token.roles = (user.roles ?? []) as RoleName[];
        token.storeIds = (user.storeIds ?? []) as string[];
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.companyId = (token.companyId as string | null) ?? null;
        session.user.roles = (token.roles as RoleName[]) ?? [];
        session.user.storeIds = (token.storeIds as string[]) ?? [];
      }
      return session;
    },
  },
  providers: [],
} satisfies NextAuthConfig;
