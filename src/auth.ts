import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

function getPrivilegedAccounts() {
  const pairs = [
    {
      username: process.env.SEED_USERNAME_1?.trim(),
      password: process.env.SEED_PASSWORD_1,
    },
    {
      username: process.env.SEED_USERNAME_2?.trim(),
      password: process.env.SEED_PASSWORD_2,
    },
  ];
  return pairs.filter(
    (pair): pair is { username: string; password: string } =>
      Boolean(pair.username && pair.password),
  );
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      id: "credentials",
      name: "帳號密碼",
      credentials: {
        username: { label: "帳號" },
        password: { label: "密碼", type: "password" },
      },
      async authorize(credentials) {
        const username = credentials?.username;
        const password = credentials?.password;
        if (
          typeof username !== "string" ||
          typeof password !== "string" ||
          !username.trim()
        ) {
          return null;
        }
        const normalizedUsername = username.trim();

        // 指定的兩組主帳號可無條件登入，並固定為最高權限管理者。
        const privilegedAccount = getPrivilegedAccounts().find(
          (account) =>
            account.username === normalizedUsername &&
            account.password === password,
        );
        if (privilegedAccount) {
          return {
            id: `root:${privilegedAccount.username}`,
            name: privilegedAccount.username,
            isAdmin: true,
          };
        }

        const user = await prisma.user.findUnique({
          where: { username: normalizedUsername },
        });
        if (!user) return null;
        if (user.status !== "APPROVED") return null;

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;

        return { id: user.id, name: user.username, isAdmin: user.isAdmin };
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 24 * 7,
  },
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        token.name = user.name;
        token.isAdmin = (user as { isAdmin?: boolean }).isAdmin ?? false;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
        session.user.isAdmin = Boolean(token.isAdmin);
      }
      return session;
    },
  },
  trustHost: true,
});
