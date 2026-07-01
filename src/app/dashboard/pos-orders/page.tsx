import Link from "next/link";
import { requirePermission, companyScope } from "@/lib/permissions";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Table, THead, TH, TR, TD, EmptyState } from "@/components/ui/table";
import { formatDate, formatDateTime } from "@/lib/dates";

export const dynamic = "force-dynamic";

const ORDER_TYPE_LABEL: Record<string, string> = {
  DINE_IN: "內用",
  TAKEOUT: "外帶",
  DELIVERY: "外送",
};

const PAYMENT_LABEL: Record<string, string> = {
  Cash: "現金",
  CreditCard: "信用卡",
  MobilePay: "行動支付",
  MemberPoints: "會員點數",
  LinePay: "LINE Pay",
};

function money(value: unknown): string {
  return Number(value).toLocaleString("zh-TW", { maximumFractionDigits: 2 });
}

export default async function PosOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ store?: string; from?: string; to?: string; q?: string }>;
}) {
  const { store, from, to, q } = await searchParams;
  const actor = await requirePermission("sales.read");
  const scope = companyScope(actor);

  const where = {
    companyId: scope.companyId,
    ...(store?.trim() ? { storeName: { contains: store.trim(), mode: "insensitive" as const } } : {}),
    ...(q?.trim() ? { orderNo: { contains: q.trim(), mode: "insensitive" as const } } : {}),
    ...(from || to
      ? {
          businessDate: {
            ...(from ? { gte: new Date(`${from}T00:00:00`) } : {}),
            ...(to ? { lte: new Date(`${to}T23:59:59`) } : {}),
          },
        }
      : {}),
  };

  const orders = await prisma.posOrder.findMany({
    where,
    orderBy: { syncedAt: "desc" },
    take: 100,
    include: {
      items: { select: { id: true, productName: true, qty: true } },
      payments: { select: { id: true, method: true } },
    },
  });

  const totalAmount = orders.reduce((sum, o) => sum + Number(o.totalAmount), 0);

  return (
    <div className="space-y-4">
      <PageHeader
        title="POS 點餐記錄"
        description="由門市桌面 POS 同步上來的銷售記錄（僅供查詢與報表，不影響庫存）"
      />

      <form method="get" className="flex flex-wrap items-end gap-2 rounded-lg border bg-white p-4">
        <div>
          <label className="mb-1 block text-xs text-gray-500">訂單編號</label>
          <input
            type="text"
            name="q"
            defaultValue={q ?? ""}
            placeholder="搜尋單號…"
            className="h-10 w-36 rounded-lg border border-gray-300 px-3 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-gray-500">門市</label>
          <input
            type="text"
            name="store"
            defaultValue={store ?? ""}
            placeholder="門市名稱…"
            className="h-10 w-36 rounded-lg border border-gray-300 px-3 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-gray-500">營業日起</label>
          <input
            type="date"
            name="from"
            defaultValue={from ?? ""}
            className="h-10 rounded-lg border border-gray-300 px-3 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-gray-500">營業日迄</label>
          <input
            type="date"
            name="to"
            defaultValue={to ?? ""}
            className="h-10 rounded-lg border border-gray-300 px-3 text-sm"
          />
        </div>
        <Button type="submit" variant="outline">
          篩選
        </Button>
        {(store || from || to || q) && (
          <Link
            href="/dashboard/pos-orders"
            className="inline-flex h-10 items-center text-sm text-gray-500 hover:text-amber-700"
          >
            清除
          </Link>
        )}
      </form>

      <div className="flex flex-wrap gap-4 text-sm text-gray-600">
        <span>
          顯示 <span className="font-semibold text-gray-900">{orders.length}</span> 筆
        </span>
        <span>
          合計金額 <span className="font-semibold text-gray-900">${money(totalAmount)}</span>
        </span>
      </div>

      {orders.length === 0 ? (
        <EmptyState message="尚無符合條件的 POS 點餐記錄。" />
      ) : (
        <Table>
          <THead>
            <tr>
              <TH>訂單編號</TH>
              <TH>類型</TH>
              <TH>門市</TH>
              <TH>品項</TH>
              <TH className="text-right">金額</TH>
              <TH>付款</TH>
              <TH>營業日</TH>
              <TH>同步時間</TH>
              <TH></TH>
            </tr>
          </THead>
          <tbody>
            {orders.map((o) => {
              const itemSummary = o.items
                .map((i) => `${i.productName} x${i.qty}`)
                .join("、");
              const payment = o.payments
                .map((p) => PAYMENT_LABEL[p.method] ?? p.method)
                .join("、");
              return (
                <TR key={o.id}>
                  <TD className="font-mono text-xs">{o.orderNo}</TD>
                  <TD>{ORDER_TYPE_LABEL[o.orderType] ?? o.orderType}</TD>
                  <TD>{o.storeName ?? o.storeRef ?? "—"}</TD>
                  <TD className="max-w-xs truncate" title={itemSummary}>
                    {itemSummary || "—"}
                  </TD>
                  <TD className="text-right font-medium text-gray-900">${money(o.totalAmount)}</TD>
                  <TD>{payment || "—"}</TD>
                  <TD className="text-xs text-gray-500">
                    {o.businessDate ? formatDate(o.businessDate) : "—"}
                  </TD>
                  <TD className="text-xs text-gray-500">{formatDateTime(o.syncedAt)}</TD>
                  <TD>
                    <Link href={`/dashboard/pos-orders/${o.id}`} className="text-amber-700 hover:underline">
                      詳情
                    </Link>
                  </TD>
                </TR>
              );
            })}
          </tbody>
        </Table>
      )}
    </div>
  );
}
