import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createPrismaClient() {
  return new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });
}

function hasFullDelegates(client: PrismaClient): boolean {
  return (
    typeof client.user?.findMany === "function" &&
    typeof client.employee?.findMany === "function" &&
    typeof client.shiftUnavailability?.findMany === "function" &&
    typeof client.inventoryItem?.findMany === "function"
  );
}

function getPrisma(): PrismaClient {
  const cached = globalForPrisma.prisma;

  if (cached && hasFullDelegates(cached)) {
    return cached;
  }

  if (cached && !hasFullDelegates(cached)) {
    cached.$disconnect().catch(() => {});
    globalForPrisma.prisma = undefined;
  }

  const fresh = createPrismaClient();

  if (!hasFullDelegates(fresh)) {
    throw new Error(
      "Prisma Client 未載入完整資料模型（缺少 employee 等 delegate）。請執行 npx prisma generate，並確認 next.config 已設定 serverExternalPackages: ['@prisma/client']，然後重啟開發伺服器。",
    );
  }

  globalForPrisma.prisma = fresh;
  return fresh;
}

export const prisma = getPrisma();
