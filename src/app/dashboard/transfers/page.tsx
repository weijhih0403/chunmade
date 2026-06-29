import { requirePermission, companyScope } from "@/lib/permissions";
import { prisma } from "@/lib/db";
import { listWarehouses, getTrackedItems } from "@/modules/inventory/service";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, THead, TH, TR, TD, EmptyState, Badge } from "@/components/ui/table";
import { formatDateTime } from "@/lib/dates";
import { TransferForm } from "./transfer-form";

export const dynamic = "force-dynamic";

export default async function TransfersPage() {
  const actor = await requirePermission("inventory.transfer");
  const scope = companyScope(actor);
  const [warehouses, items, transfers] = await Promise.all([
    listWarehouses(actor),
    getTrackedItems(actor),
    prisma.stockTransfer.findMany({
      where: { ...scope, deletedAt: null },
      include: { items: true },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);
  const whName = new Map(warehouses.map((w) => [w.id, w.name]));

  return (
    <div className="space-y-6">
      <PageHeader title="倉庫調撥" description="於不同倉庫間移轉庫存（即時出入庫）" />

      <Card>
        <CardHeader>
          <CardTitle>新增調撥</CardTitle>
        </CardHeader>
        <CardContent>
          <TransferForm
            warehouses={warehouses.map((w) => ({ id: w.id, name: w.name }))}
            items={items.map((i) => ({ id: i.id, name: `${i.name}（${i.sku}）` }))}
          />
        </CardContent>
      </Card>

      <Table>
        <THead>
          <tr>
            <TH>單號</TH>
            <TH>來源 → 目的</TH>
            <TH>品項數</TH>
            <TH>狀態</TH>
            <TH>時間</TH>
          </tr>
        </THead>
        <tbody>
          {transfers.length === 0 ? (
            <tr>
              <td colSpan={5}>
                <EmptyState message="尚無調撥紀錄。" />
              </td>
            </tr>
          ) : (
            transfers.map((t) => (
              <TR key={t.id}>
                <TD className="font-mono text-xs">{t.transferNo}</TD>
                <TD>
                  {whName.get(t.fromWarehouseId) ?? t.fromWarehouseId} →{" "}
                  {whName.get(t.toWarehouseId) ?? t.toWarehouseId}
                </TD>
                <TD>{t.items.length}</TD>
                <TD>
                  <Badge color="green">已完成</Badge>
                </TD>
                <TD className="text-xs text-gray-500">{formatDateTime(t.createdAt)}</TD>
              </TR>
            ))
          )}
        </tbody>
      </Table>
    </div>
  );
}
