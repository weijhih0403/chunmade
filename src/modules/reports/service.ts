import "server-only";
import { prisma } from "@/lib/db";
import { type Actor, companyScope } from "@/lib/permissions";
import { formatDate } from "@/lib/dates";

export type SalesReportRange = { from: Date; to: Date };

export function defaultRange(): SalesReportRange {
  const to = new Date();
  const from = new Date(Date.now() - 29 * 86400000);
  from.setHours(0, 0, 0, 0);
  return { from, to };
}

const COUNTED_STATUSES = ["PAID", "COMPLETED", "PARTIALLY_REFUNDED"] as const;

export async function salesSummary(actor: Actor, range: SalesReportRange) {
  const scope = companyScope(actor);
  const orders = await prisma.salesOrder.findMany({
    where: {
      ...scope,
      deletedAt: null,
      status: { in: [...COUNTED_STATUSES] },
      createdAt: { gte: range.from, lte: range.to },
    },
    select: {
      id: true,
      total: true,
      grossProfit: true,
      costTotal: true,
      createdAt: true,
    },
  });

  let totalRevenue = 0;
  let totalProfit = 0;
  const byDay = new Map<string, { revenue: number; profit: number; orders: number }>();
  for (const o of orders) {
    const rev = Number(o.total);
    const profit = Number(o.grossProfit);
    totalRevenue += rev;
    totalProfit += profit;
    const key = formatDate(o.createdAt);
    const cur = byDay.get(key) ?? { revenue: 0, profit: 0, orders: 0 };
    cur.revenue += rev;
    cur.profit += profit;
    cur.orders += 1;
    byDay.set(key, cur);
  }

  const daily = [...byDay.entries()]
    .map(([date, v]) => ({ date, ...v }))
    .sort((a, b) => b.date.localeCompare(a.date));

  return {
    orderCount: orders.length,
    totalRevenue,
    totalProfit,
    avgOrderValue: orders.length ? totalRevenue / orders.length : 0,
    daily,
  };
}

export async function topItems(actor: Actor, range: SalesReportRange, limit = 10) {
  const scope = companyScope(actor);
  const grouped = await prisma.salesOrderItem.groupBy({
    by: ["itemId", "name"],
    where: {
      order: {
        ...scope,
        deletedAt: null,
        status: { in: [...COUNTED_STATUSES] },
        createdAt: { gte: range.from, lte: range.to },
      },
    },
    _sum: { quantity: true, lineTotal: true },
    orderBy: { _sum: { lineTotal: "desc" } },
    take: limit,
  });
  return grouped.map((g) => ({
    name: g.name,
    quantity: Number(g._sum.quantity ?? 0),
    revenue: Number(g._sum.lineTotal ?? 0),
  }));
}

export async function paymentBreakdown(actor: Actor, range: SalesReportRange) {
  const scope = companyScope(actor);
  const grouped = await prisma.payment.groupBy({
    by: ["method"],
    where: {
      ...scope,
      status: "PAID",
      paidAt: { gte: range.from, lte: range.to },
    },
    _sum: { amount: true },
    _count: true,
  });
  return grouped.map((g) => ({
    method: g.method,
    amount: Number(g._sum.amount ?? 0),
    count: g._count,
  }));
}
