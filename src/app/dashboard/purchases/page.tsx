import Link from "next/link";
import { requirePermission } from "@/lib/permissions";
import { listPurchaseOrders } from "@/modules/purchasing/service";
import { PageHeader } from "@/components/layout/page-header";
import { Table, THead, TH, TR, TD, EmptyState, Badge } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { formatTWD } from "@/lib/money";
import { formatDate } from "@/lib/dates";
import { PO_STATUS } from "@/modules/purchasing/labels";

export const dynamic = "force-dynamic";

export default async function PurchasesPage() {
  const actor = await requirePermission("purchase.read");
  const orders = await listPurchaseOrders(actor);
  const canManage = actor.permissions.has("purchase.manage");

  return (
    <div>
      <PageHeader
        title="採購單"
        description="採購流程：草稿 → 送審 → 核准 → 收貨入庫"
        action={
          canManage ? (
            <Link href="/dashboard/purchases/new">
              <Button>新增採購單</Button>
            </Link>
          ) : null
        }
      />

      {orders.length === 0 ? (
        <EmptyState message="尚無採購單。" />
      ) : (
        <Table>
          <THead>
            <tr>
              <TH>單號</TH>
              <TH>供應商</TH>
              <TH>明細</TH>
              <TH className="text-right">金額</TH>
              <TH>狀態</TH>
              <TH>日期</TH>
              <TH></TH>
            </tr>
          </THead>
          <tbody>
            {orders.map((o) => (
              <TR key={o.id}>
                <TD className="font-mono text-xs">{o.orderNo}</TD>
                <TD>{o.supplier.name}</TD>
                <TD>{o.items.length} 項</TD>
                <TD className="text-right">{formatTWD(o.total)}</TD>
                <TD>
                  <Badge color={PO_STATUS[o.status].color}>{PO_STATUS[o.status].label}</Badge>
                </TD>
                <TD className="text-xs text-gray-500">{formatDate(o.orderDate)}</TD>
                <TD>
                  <Link
                    href={`/dashboard/purchases/${o.id}`}
                    className="text-amber-700 hover:underline"
                  >
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
