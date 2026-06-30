import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/permissions";
import { getProductionOrder } from "@/modules/production/service";
import { completeProductionAction } from "@/modules/production/actions";
import { BackButton } from "@/components/layout/back-button";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, THead, TH, TR, TD, Badge } from "@/components/ui/table";
import { SubmitButton } from "@/components/ui/submit-button";
import { Input } from "@/components/ui/input";
import { formatTWD } from "@/lib/money";

export const dynamic = "force-dynamic";

export default async function ProductionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const actor = await requirePermission("production.read");
  const data = await getProductionOrder(actor, id);
  if (!data) notFound();

  const { mo, productName, materials } = data;
  const canExecute = actor.permissions.has("production.execute");
  const completable = mo.status === "RELEASED" || mo.status === "IN_PROGRESS";

  return (
    <div className="space-y-6">
      <BackButton fallbackHref="/dashboard/production" />

      <PageHeader
        title={`生產單 ${mo.orderNo}`}
        description={`產出：${productName}（計畫 ${mo.plannedQty.toString()}）`}
        action={
          <Badge color={mo.status === "COMPLETED" ? "green" : "amber"}>
            {mo.status === "COMPLETED" ? "已完工" : "進行中"}
          </Badge>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>計畫用料（依配方展開）</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <THead>
              <tr>
                <TH>原料</TH>
                <TH className="text-right">計畫用量</TH>
                <TH className="text-right">實際領用</TH>
                <TH className="text-right">單位成本</TH>
              </tr>
            </THead>
            <tbody>
              {materials.map((m) => (
                <TR key={m.id}>
                  <TD className="font-medium text-gray-900">
                    {m.itemName} <span className="text-xs text-gray-400">{m.unit}</span>
                  </TD>
                  <TD className="text-right">{m.plannedQty.toString()}</TD>
                  <TD className="text-right">{m.issuedQty.toString()}</TD>
                  <TD className="text-right">{formatTWD(m.unitCost)}</TD>
                </TR>
              ))}
            </tbody>
          </Table>
        </CardContent>
      </Card>

      {mo.status === "COMPLETED" ? (
        <Card>
          <CardContent>
            <p className="text-sm text-gray-700">
              實際產量：<span className="font-semibold">{mo.producedQty.toString()}</span>
              ，生產總成本：<span className="font-semibold">{formatTWD(mo.totalCost)}</span>
            </p>
          </CardContent>
        </Card>
      ) : (
        completable &&
        canExecute && (
          <Card>
            <CardHeader>
              <CardTitle>完工入庫</CardTitle>
            </CardHeader>
            <CardContent>
              <form action={completeProductionAction} className="flex flex-wrap items-end gap-3">
                <input type="hidden" name="productionId" value={mo.id} />
                <div>
                  <label className="mb-1 block text-xs text-gray-500">實際產量</label>
                  <Input
                    name="producedQty"
                    type="number"
                    step="0.0001"
                    defaultValue={mo.plannedQty.toString()}
                    className="w-40"
                    required
                  />
                </div>
                <SubmitButton pendingText="處理中…">完工並入庫成品</SubmitButton>
              </form>
              <p className="mt-2 text-xs text-gray-400">
                系統將依比例扣除原料、計算成本、建立成品批號與效期。
              </p>
            </CardContent>
          </Card>
        )
      )}
    </div>
  );
}
