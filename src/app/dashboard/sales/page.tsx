import Link from "next/link";
import { requirePermission } from "@/lib/permissions";
import { listSalesOrders } from "@/modules/pos/service";
import { PageHeader } from "@/components/layout/page-header";
import { Table, THead, TH, TR, TD, EmptyState, Badge } from "@/components/ui/table";
import { formatTWD } from "@/lib/money";
import { formatDateTime } from "@/lib/dates";
import { SALES_STATUS } from "@/modules/pos/labels";

export const dynamic = "force-dynamic";

export default async function SalesPage() {
  const actor = await requirePermission("sales.read");
  const orders = await listSalesOrders(actor);

  return (
    <div>
      <PageHeader title="銷售訂單" description="POS 結帳產生的訂單" />
      {orders.length === 0 ? (
        <EmptyState message="尚無銷售訂單。" />
      ) : (
        <Table>
          <THead>
            <tr>
              <TH>單號</TH>
              <TH>明細</TH>
              <TH className="text-right">金額</TH>
              <TH className="text-right">毛利</TH>
              <TH>付款</TH>
              <TH>狀態</TH>
              <TH>時間</TH>
              <TH></TH>
            </tr>
          </THead>
          <tbody>
            {orders.map((o) => (
              <TR key={o.id}>
                <TD className="font-mono text-xs">{o.orderNo}</TD>
                <TD>{o.items.length} 項</TD>
                <TD className="text-right font-semibold">{formatTWD(o.total)}</TD>
                <TD className="text-right text-gray-500">{formatTWD(o.grossProfit)}</TD>
                <TD className="text-xs">{o.payments.map((p) => p.method).join(", ")}</TD>
                <TD>
                  <Badge color={SALES_STATUS[o.status].color}>{SALES_STATUS[o.status].label}</Badge>
                </TD>
                <TD className="text-xs text-gray-500">{formatDateTime(o.createdAt)}</TD>
                <TD>
                  <Link href={`/dashboard/sales/${o.id}`} className="text-amber-700 hover:underline">
                    開啟
                  </Link>
                </TD>
              </TR>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
}
