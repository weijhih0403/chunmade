import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission, companyScope } from "@/lib/permissions";
import { prisma } from "@/lib/db";
import { BackButton } from "@/components/layout/back-button";
import { PageHeader } from "@/components/layout/page-header";
import { Table, THead, TH, TR, TD } from "@/components/ui/table";
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

export default async function PosOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const actor = await requirePermission("sales.read");
  const scope = companyScope(actor);

  const order = await prisma.posOrder.findFirst({
    where: { companyId: scope.companyId, id },
    include: {
      items: true,
      payments: true,
    },
  });
  if (!order) notFound();

  return (
    <div className="space-y-4">
      <BackButton fallbackHref="/dashboard/pos-orders" />
      <PageHeader
        title={`POS 訂單 ${order.orderNo}`}
        description={order.storeName ?? order.storeRef ?? "—"}
      />

      <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border bg-white p-3">
          <p className="text-gray-500">類型</p>
          <p className="font-medium">{ORDER_TYPE_LABEL[order.orderType] ?? order.orderType}</p>
        </div>
        <div className="rounded-lg border bg-white p-3">
          <p className="text-gray-500">營業日</p>
          <p className="font-medium">{order.businessDate ? formatDate(order.businessDate) : "—"}</p>
        </div>
        <div className="rounded-lg border bg-white p-3">
          <p className="text-gray-500">付款時間</p>
          <p className="font-medium">{order.paidAt ? formatDateTime(order.paidAt) : "—"}</p>
        </div>
        <div className="rounded-lg border bg-white p-3">
          <p className="text-gray-500">同步時間</p>
          <p className="font-medium">{formatDateTime(order.syncedAt)}</p>
        </div>
      </div>

      <Table>
        <THead>
          <tr>
            <TH>品項</TH>
            <TH className="text-right">數量</TH>
            <TH className="text-right">單價</TH>
            <TH className="text-right">小計</TH>
            <TH>備註</TH>
          </tr>
        </THead>
        <tbody>
          {order.items.map((it) => (
            <TR key={it.id}>
              <TD className="font-medium text-gray-900">{it.productName}</TD>
              <TD className="text-right">{it.qty}</TD>
              <TD className="text-right">${money(it.unitPrice)}</TD>
              <TD className="text-right">${money(it.lineTotal)}</TD>
              <TD className="text-xs text-gray-500">{it.note ?? "—"}</TD>
            </TR>
          ))}
        </tbody>
      </Table>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-lg border bg-white p-4 text-sm space-y-1">
          <div className="flex justify-between">
            <span className="text-gray-500">小計</span>
            <span>${money(order.subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">折扣</span>
            <span>${money(order.discountAmount)}</span>
          </div>
          <div className="flex justify-between font-semibold">
            <span>合計</span>
            <span>${money(order.totalAmount)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">收款</span>
            <span>${money(order.paidAmount)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">找零</span>
            <span>${money(order.changeAmount)}</span>
          </div>
        </div>
        <div className="rounded-lg border bg-white p-4 text-sm">
          <p className="mb-2 font-medium text-gray-700">付款方式</p>
          {order.payments.length === 0 ? (
            <p className="text-gray-400">—</p>
          ) : (
            <ul className="space-y-1">
              {order.payments.map((p) => (
                <li key={p.id} className="flex justify-between">
                  <span>{PAYMENT_LABEL[p.method] ?? p.method}</span>
                  <span>${money(p.amount)}</span>
                </li>
              ))}
            </ul>
          )}
          {order.note && (
            <p className="mt-3 text-xs text-gray-500">備註：{order.note}</p>
          )}
        </div>
      </div>
    </div>
  );
}
