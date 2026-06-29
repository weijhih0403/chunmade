import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/permissions";
import { getSalesOrder } from "@/modules/pos/service";
import { refundOrderAction } from "@/modules/pos/checkout";
import { reprintOrderLabelAction } from "@/modules/print/actions";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, THead, TH, TR, TD, Badge } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatTWD } from "@/lib/money";
import { formatDateTime } from "@/lib/dates";
import { SALES_STATUS } from "@/modules/pos/labels";

export const dynamic = "force-dynamic";

export default async function SalesDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const actor = await requirePermission("sales.read");
  const order = await getSalesOrder(actor, id);
  if (!order) notFound();

  const canRefund = actor.permissions.has("sales.refund");
  const canPrint = actor.permissions.has("print.operate");
  const refundable = order.status === "PAID" || order.status === "COMPLETED";

  return (
    <div className="space-y-6">
      <PageHeader
        title={`訂單 ${order.orderNo}`}
        description={formatDateTime(order.createdAt)}
        action={<Badge color={SALES_STATUS[order.status].color}>{SALES_STATUS[order.status].label}</Badge>}
      />

      <Card>
        <CardHeader>
          <CardTitle>訂單明細</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <THead>
              <tr>
                <TH>商品</TH>
                <TH className="text-right">數量</TH>
                <TH className="text-right">單價</TH>
                <TH className="text-right">小計</TH>
              </tr>
            </THead>
            <tbody>
              {order.items.map((it) => (
                <TR key={it.id}>
                  <TD className="font-medium text-gray-900">{it.name}</TD>
                  <TD className="text-right">{it.quantity.toString()}</TD>
                  <TD className="text-right">{formatTWD(it.unitPrice)}</TD>
                  <TD className="text-right">{formatTWD(it.lineTotal)}</TD>
                </TR>
              ))}
            </tbody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <CardContent className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">合計</span>
              <span className="font-semibold">{formatTWD(order.total)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">收款</span>
              <span>{formatTWD(order.paidTotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">找零</span>
              <span>{formatTWD(order.changeAmount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">成本</span>
              <span>{formatTWD(order.costTotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">毛利</span>
              <span className="font-semibold text-green-600">{formatTWD(order.grossProfit)}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>操作</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {canPrint && (
              <form action={reprintOrderLabelAction}>
                <input type="hidden" name="orderId" value={order.id} />
                <Button type="submit" variant="outline">
                  補印出單標籤
                </Button>
              </form>
            )}
            {canRefund && refundable && (
              <form action={refundOrderAction} className="space-y-2">
                <input type="hidden" name="orderId" value={order.id} />
                <Input name="reason" placeholder="退款原因（選填）" />
                <Button type="submit" variant="danger">
                  全額退款（回補庫存）
                </Button>
              </form>
            )}
            {order.refunds.length > 0 && (
              <p className="text-sm text-red-600">
                已退款：{order.refunds.map((r) => r.refundNo).join("、")}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
