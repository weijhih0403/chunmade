import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/permissions";
import { getPurchaseOrder } from "@/modules/purchasing/service";
import {
  submitPurchaseOrderAction,
  approvePurchaseOrderAction,
  cancelPurchaseOrderAction,
  receiveGoodsAction,
} from "@/modules/purchasing/actions";
import { BackButton } from "@/components/layout/back-button";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, THead, TH, TR, TD, Badge } from "@/components/ui/table";
import { SubmitButton } from "@/components/ui/submit-button";
import { formatTWD } from "@/lib/money";
import { PO_STATUS } from "@/modules/purchasing/labels";

export const dynamic = "force-dynamic";

export default async function PurchaseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const actor = await requirePermission("purchase.read");
  const data = await getPurchaseOrder(actor, id);
  if (!data) notFound();

  const { po, lines } = data;
  const canManage = actor.permissions.has("purchase.manage");
  const canApprove = actor.permissions.has("purchase.approve");
  const canReceive = actor.permissions.has("purchase.receive");
  const receivable = po.status === "APPROVED" || po.status === "PARTIALLY_RECEIVED";

  return (
    <div className="space-y-6">
      <BackButton fallbackHref="/dashboard/purchases" />

      <PageHeader
        title={`採購單 ${po.orderNo}`}
        description={`供應商：${po.supplier.name}`}
        action={<Badge color={PO_STATUS[po.status].color}>{PO_STATUS[po.status].label}</Badge>}
      />

      <div className="flex flex-wrap gap-2">
        {canManage && po.status === "DRAFT" && (
          <form action={submitPurchaseOrderAction}>
            <input type="hidden" name="id" value={po.id} />
            <SubmitButton>送審</SubmitButton>
          </form>
        )}
        {canApprove && po.status === "PENDING_APPROVAL" && (
          <form action={approvePurchaseOrderAction}>
            <input type="hidden" name="id" value={po.id} />
            <SubmitButton>核准</SubmitButton>
          </form>
        )}
        {canManage && (po.status === "DRAFT" || po.status === "PENDING_APPROVAL") && (
          <form action={cancelPurchaseOrderAction}>
            <input type="hidden" name="id" value={po.id} />
            <SubmitButton variant="outline">取消採購單</SubmitButton>
          </form>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>採購明細</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {receivable && canReceive ? (
            <form action={receiveGoodsAction}>
              <input type="hidden" name="orderId" value={po.id} />
              <Table>
                <THead>
                  <tr>
                    <TH>商品</TH>
                    <TH className="text-right">訂購</TH>
                    <TH className="text-right">已收</TH>
                    <TH className="text-right">單價</TH>
                    <TH className="text-right">本次收貨</TH>
                    <TH>批號（選填）</TH>
                  </tr>
                </THead>
                <tbody>
                  {lines.map((l) => (
                    <TR key={l.id}>
                      <TD className="font-medium text-gray-900">
                        {l.itemName} <span className="text-xs text-gray-400">{l.unit}</span>
                      </TD>
                      <TD className="text-right">{l.quantity.toString()}</TD>
                      <TD className="text-right">{l.receivedQty.toString()}</TD>
                      <TD className="text-right">{formatTWD(l.unitPrice)}</TD>
                      <TD className="text-right">
                        <input
                          name={`recv_${l.id}`}
                          type="number"
                          step="0.0001"
                          min="0"
                          defaultValue="0"
                          className="h-9 w-24 rounded border border-gray-300 px-2 text-right"
                        />
                      </TD>
                      <TD>
                        <input
                          name={`lot_${l.id}`}
                          className="h-9 w-28 rounded border border-gray-300 px-2"
                        />
                      </TD>
                    </TR>
                  ))}
                </tbody>
              </Table>
              <div className="p-4">
                <SubmitButton pendingText="處理中…">確認收貨入庫</SubmitButton>
              </div>
            </form>
          ) : (
            <Table>
              <THead>
                <tr>
                  <TH>商品</TH>
                  <TH className="text-right">訂購</TH>
                  <TH className="text-right">已收</TH>
                  <TH className="text-right">單價</TH>
                  <TH className="text-right">小計</TH>
                </tr>
              </THead>
              <tbody>
                {lines.map((l) => (
                  <TR key={l.id}>
                    <TD className="font-medium text-gray-900">
                      {l.itemName} <span className="text-xs text-gray-400">{l.unit}</span>
                    </TD>
                    <TD className="text-right">{l.quantity.toString()}</TD>
                    <TD className="text-right">{l.receivedQty.toString()}</TD>
                    <TD className="text-right">{formatTWD(l.unitPrice)}</TD>
                    <TD className="text-right">{formatTWD(l.lineTotal)}</TD>
                  </TR>
                ))}
              </tbody>
            </Table>
          )}
        </CardContent>
      </Card>

      <div className="text-right text-lg font-semibold">合計：{formatTWD(po.total)}</div>
    </div>
  );
}
