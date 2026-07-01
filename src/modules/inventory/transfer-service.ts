import "server-only";
import { prisma } from "@/lib/db";
import { businessMonthKey, endOfBusinessDay, formatDate, startOfBusinessDay } from "@/lib/dates";
import { type Actor, companyScope } from "@/lib/permissions";
import { add, ZERO, type Decimal } from "@/lib/money";
import type { TransferSettlementStatus } from "./transfer-labels";

type TransferRecord = {
  id: string;
  transferNo: string;
  fromWarehouseId: string;
  toWarehouseId: string;
  completedAt: Date | null;
  createdAt: Date;
  settlementAmount: Decimal | null;
  collectFromStoreId: string | null;
  payToStoreId: string | null;
  settlementStatus: TransferSettlementStatus;
  settlementNote: string | null;
  items: {
    id: string;
    itemId: string;
    quantity: Decimal;
    unitCost: Decimal;
  }[];
};

/** 解析 yyyyMM 或 yyyy-MM，回傳該月在台北時區的起迄時間 */
export function parseMonthRange(month?: string) {
  const key = month?.replace("-", "") ?? businessMonthKey();
  const y = Number(key.slice(0, 4));
  const m = Number(key.slice(4, 6));
  if (!y || !m || m < 1 || m > 12) {
    const fallback = businessMonthKey();
    return parseMonthRange(fallback);
  }
  const mm = String(m).padStart(2, "0");
  const lastDay = new Date(y, m, 0).getDate();
  return {
    monthKey: `${y}${mm}`,
    monthLabel: `${y}年${m}月`,
    from: startOfBusinessDay(new Date(`${y}-${mm}-01`)),
    to: endOfBusinessDay(new Date(`${y}-${mm}-${String(lastDay).padStart(2, "0")}`)),
  };
}

export async function listMonthTransfers(actor: Actor, month?: string) {
  const scope = companyScope(actor);
  const { monthKey, monthLabel, from, to } = parseMonthRange(month);

  const [rawTransfers, stores, warehouses] = await Promise.all([
    prisma.stockTransfer.findMany({
      where: {
        ...scope,
        deletedAt: null,
        status: "COMPLETED",
        completedAt: { gte: from, lte: to },
      },
      include: {
        items: true,
      },
      orderBy: { completedAt: "desc" },
    }),
    prisma.store.findMany({
      where: { ...scope, deletedAt: null },
      select: { id: true, name: true, code: true },
    }),
    prisma.warehouse.findMany({
      where: { ...scope, deletedAt: null },
      include: { store: { select: { id: true, name: true } } },
    }),
  ]);

  const transfers = rawTransfers as unknown as TransferRecord[];

  const storeName = new Map(stores.map((s) => [s.id, s.name]));
  const whMap = new Map(warehouses.map((w) => [w.id, w]));

  const itemIds = [...new Set(transfers.flatMap((t) => t.items.map((i) => i.itemId)))];
  const catalogItems = await prisma.item.findMany({
    where: { ...scope, id: { in: itemIds } },
    include: { baseUnit: true },
  });
  const itemMap = new Map(catalogItems.map((i) => [i.id, i]));

  const rows = transfers.map((t) => {
    const fromWh = whMap.get(t.fromWarehouseId);
    const toWh = whMap.get(t.toWarehouseId);
    const lineTotal = t.items.reduce(
      (sum, line) => sum.add(line.quantity.mul(line.unitCost)),
      ZERO,
    );
    const amount = t.settlementAmount?.greaterThan(0) ? t.settlementAmount : lineTotal;

    return {
      id: t.id,
      transferNo: t.transferNo,
      completedAt: t.completedAt ?? t.createdAt,
      fromWarehouse: fromWh?.name ?? t.fromWarehouseId,
      toWarehouse: toWh?.name ?? t.toWarehouseId,
      fromStore: fromWh?.store?.name ?? "—",
      toStore: toWh?.store?.name ?? "—",
      itemCount: t.items.length,
      settlementAmount: amount,
      collectFromStoreId: t.collectFromStoreId,
      collectFromStore: t.collectFromStoreId
        ? (storeName.get(t.collectFromStoreId) ?? "—")
        : null,
      payToStoreId: t.payToStoreId,
      payToStore: t.payToStoreId ? (storeName.get(t.payToStoreId) ?? "—") : null,
      settlementStatus: t.settlementStatus,
      settlementNote: t.settlementNote,
      items: t.items.map((line) => {
        const item = itemMap.get(line.itemId);
        return {
          sku: item?.sku ?? line.itemId,
          name: item?.name ?? "—",
          quantity: line.quantity,
          unit: item?.baseUnit.name ?? "",
          unitCost: line.unitCost,
          lineTotal: line.quantity.mul(line.unitCost),
        };
      }),
    };
  });

  return { monthKey, monthLabel, from, to, rows, stores };
}

export type StoreSettlementSummary = {
  storeId: string;
  storeName: string;
  receivable: typeof ZERO;
  payable: typeof ZERO;
  pendingReceivable: typeof ZERO;
  pendingPayable: typeof ZERO;
};

/** 依門市彙總本月應收 / 應付貨款 */
export function buildStoreSettlementSummary(
  rows: Awaited<ReturnType<typeof listMonthTransfers>>["rows"],
  stores: { id: string; name: string }[],
): StoreSettlementSummary[] {
  const map = new Map<string, StoreSettlementSummary>();
  for (const s of stores) {
    map.set(s.id, {
      storeId: s.id,
      storeName: s.name,
      receivable: ZERO,
      payable: ZERO,
      pendingReceivable: ZERO,
      pendingPayable: ZERO,
    });
  }

  for (const t of rows) {
    const amt = t.settlementAmount;
    const pending = t.settlementStatus === "PENDING";

    if (t.collectFromStoreId) {
      const entry = map.get(t.collectFromStoreId);
      if (entry) {
        entry.payable = add(entry.payable, amt);
        if (pending) entry.pendingPayable = add(entry.pendingPayable, amt);
      }
    }
    if (t.payToStoreId) {
      const entry = map.get(t.payToStoreId);
      if (entry) {
        entry.receivable = add(entry.receivable, amt);
        if (pending) entry.pendingReceivable = add(entry.pendingReceivable, amt);
      }
    }
  }

  return [...map.values()].filter(
    (s) =>
      s.receivable.greaterThan(0) ||
      s.payable.greaterThan(0) ||
      s.pendingReceivable.greaterThan(0) ||
      s.pendingPayable.greaterThan(0),
  );
}

export function formatMonthInput(monthKey: string) {
  return `${monthKey.slice(0, 4)}-${monthKey.slice(4, 6)}`;
}

export function monthHref(monthKey: string) {
  return `/dashboard/transfers?month=${formatMonthInput(monthKey)}`;
}

export { formatDate };
