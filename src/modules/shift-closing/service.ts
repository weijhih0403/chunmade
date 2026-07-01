import "server-only";
import { prisma } from "@/lib/db";
import { startOfBusinessDay } from "@/lib/dates";
import { type Actor, assertStoreAccess, companyScope } from "@/lib/permissions";

type ShiftClosingDelegate = {
  findMany: (args: unknown) => Promise<ShiftClosingRow[]>;
  findFirst: (args: unknown) => Promise<ShiftClosingRow | null>;
};

type PrismaWithShiftClosing = typeof prisma & {
  shiftClosingReport: ShiftClosingDelegate;
};

export type ShiftClosingRow = {
  id: string;
  reportNo: string;
  storeId: string;
  closingDate: Date;
  qty520: number;
  qty850: number;
  qty700: number;
  qty500: number;
  signatureData: string | null;
  recognizedText: string | null;
  signerName: string | null;
  matchedEmployeeId: string | null;
  ocrConfidence: number | null;
  createdAt: Date;
  store: { name: string };
};

const shiftClosingDb = () => (prisma as unknown as PrismaWithShiftClosing).shiftClosingReport;

export async function listShiftClosingStores(actor: Actor) {
  const scope = companyScope(actor);
  const stores = await prisma.store.findMany({
    where: { ...scope, deletedAt: null, isActive: true },
    orderBy: { code: "asc" },
  });
  return stores.filter((s) => {
    try {
      assertStoreAccess(actor, s.id);
      return true;
    } catch {
      return false;
    }
  });
}

export async function listShiftClosingEmployees(actor: Actor) {
  const scope = companyScope(actor);
  return prisma.employee.findMany({
    where: { ...scope, deletedAt: null, isActive: true },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}

export async function listShiftClosingReports(actor: Actor, limit = 30) {
  const scope = companyScope(actor);
  return shiftClosingDb().findMany({
    where: { ...scope, deletedAt: null },
    include: { store: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function getShiftClosingReport(actor: Actor, id: string) {
  const scope = companyScope(actor);
  const report = await shiftClosingDb().findFirst({
    where: { ...scope, id, deletedAt: null },
    include: { store: true },
  });
  if (!report) return null;
  assertStoreAccess(actor, report.storeId);
  return report;
}

export function defaultClosingDate() {
  return startOfBusinessDay();
}
