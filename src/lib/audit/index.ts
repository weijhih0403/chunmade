import type { Prisma, PrismaClient } from "@prisma/client";

type PrismaLike = PrismaClient | Prisma.TransactionClient;

export type AuditInput = {
  companyId?: string | null;
  userId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  before?: Prisma.InputJsonValue;
  after?: Prisma.InputJsonValue;
  ip?: string | null;
  userAgent?: string | null;
};

/**
 * 寫入稽核紀錄。可傳入 transaction client 以與業務操作同一交易完成。
 */
export async function writeAudit(db: PrismaLike, input: AuditInput): Promise<void> {
  await db.auditLog.create({
    data: {
      companyId: input.companyId ?? null,
      userId: input.userId ?? null,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      before: input.before,
      after: input.after,
      ip: input.ip ?? null,
      userAgent: input.userAgent ?? null,
    },
  });
}
