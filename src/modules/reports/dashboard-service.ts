import "server-only";
import { prisma } from "@/lib/db";
import { add, ZERO, type Decimal } from "@/lib/money";
import { endOfBusinessDay, startOfBusinessDay, businessMonthKey } from "@/lib/dates";

export type DashboardStats = {
  todayRevenue: Decimal;
  todayOrderCount: number;
  avgOrderValue: Decimal;
  todayGrossProfit: Decimal;
  monthRevenue: Decimal;
  lowStockCount: number;
  pendingPurchaseCount: number;
  pendingProductionCount: number;
  pendingUserCount: number;
};

/** 儀表板統計：全部來自真實資料庫查詢 */
export async function getDashboardStats(companyId: string): Promise<DashboardStats> {
  const dayStart = startOfBusinessDay();
  const dayEnd = endOfBusinessDay();

  const paidStatuses = ["PAID", "PREPARING", "READY", "COMPLETED", "PARTIALLY_REFUNDED"] as const;

  const todayOrders = await prisma.salesOrder.findMany({
    where: {
      companyId,
      deletedAt: null,
      status: { in: [...paidStatuses] },
      createdAt: { gte: dayStart, lte: dayEnd },
    },
    select: { total: true, grossProfit: true },
  });

  const todayRevenue = todayOrders.reduce<Decimal>((acc, o) => add(acc, o.total), ZERO);
  const todayGrossProfit = todayOrders.reduce<Decimal>((acc, o) => add(acc, o.grossProfit), ZERO);
  const todayOrderCount = todayOrders.length;
  const avgOrderValue =
    todayOrderCount > 0 ? todayRevenue.div(todayOrderCount) : ZERO;

  // 本月營收
  const monthKey = businessMonthKey();
  const monthStart = startOfBusinessDay(new Date(`${monthKey.slice(0, 4)}-${monthKey.slice(4, 6)}-01T00:00:00`));
  const monthOrders = await prisma.salesOrder.findMany({
    where: {
      companyId,
      deletedAt: null,
      status: { in: [...paidStatuses] },
      createdAt: { gte: monthStart },
    },
    select: { total: true },
  });
  const monthRevenue = monthOrders.reduce<Decimal>((acc, o) => add(acc, o.total), ZERO);

  // 低庫存：以品項 reorderPoint 與目前結餘比較
  const items = await prisma.item.findMany({
    where: { companyId, deletedAt: null, trackStock: true, isActive: true },
    select: { id: true, reorderPoint: true },
  });
  const balances = await prisma.stockBalance.groupBy({
    by: ["itemId"],
    where: { companyId },
    _sum: { quantity: true },
  });
  const balanceMap = new Map(balances.map((b) => [b.itemId, b._sum.quantity]));
  const lowStockCount = items.filter((it) => {
    const qty = balanceMap.get(it.id) ?? ZERO;
    return it.reorderPoint.greaterThan(0) && it.reorderPoint.greaterThanOrEqualTo(qty);
  }).length;

  const [pendingPurchaseCount, pendingProductionCount, pendingUserCount] = await Promise.all([
    prisma.purchaseOrder.count({
      where: { companyId, deletedAt: null, status: { in: ["APPROVED", "PARTIALLY_RECEIVED"] } },
    }),
    prisma.productionOrder.count({
      where: { companyId, deletedAt: null, status: { in: ["RELEASED", "IN_PROGRESS"] } },
    }),
    prisma.user.count({ where: { companyId, status: "PENDING" } }),
  ]);

  return {
    todayRevenue,
    todayOrderCount,
    avgOrderValue,
    todayGrossProfit,
    monthRevenue,
    lowStockCount,
    pendingPurchaseCount,
    pendingProductionCount,
    pendingUserCount,
  };
}
