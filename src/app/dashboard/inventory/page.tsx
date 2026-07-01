import Link from "next/link";
import { requirePermission } from "@/lib/permissions";
import {
  listStockOverview,
  listWarehouses,
  getTrackedItems,
  listMovements,
} from "@/modules/inventory/service";
import { PageHeader } from "@/components/layout/page-header";
import { Table, THead, TH, TR, TD, EmptyState, Badge } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatTWD } from "@/lib/money";
import { formatDateTime } from "@/lib/dates";
import { STOCK_MOVEMENT_TYPE_LABELS } from "@/lib/constants";
import { AdjustForm, WasteForm } from "./inventory-forms";

export const dynamic = "force-dynamic";

export default async function InventoryPage() {
  const actor = await requirePermission("inventory.read");
  const [overview, warehouses, items, movements] = await Promise.all([
    listStockOverview(actor),
    listWarehouses(actor),
    getTrackedItems(actor),
    listMovements(actor),
  ]);

  const opts = {
    warehouses: warehouses.map((w) => ({ id: w.id, name: w.name })),
    items: items.map((i) => ({ id: i.id, name: `${i.name}（${i.sku}）` })),
  };
  const canAdjust = actor.permissions.has("inventory.adjust");
  const canWaste = actor.permissions.has("inventory.waste");
  const lowCount = overview.filter((r) => r.isLow).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="庫存管理"
        description="即時庫存（由不可變的庫存異動帳維護），低於補貨點會以紅色標示"
      />

      {lowCount > 0 && (
        <div className="rounded-lg bg-amber-50 px-4 py-2 text-sm text-amber-800">
          有 <span className="font-bold">{lowCount}</span> 項商品低於補貨點，建議{" "}
          <Link href="/dashboard/purchases/new" className="font-medium text-amber-900 underline">
            建立採購單
          </Link>
          。
        </div>
      )}

      <Table>
        <THead>
          <tr>
            <TH>SKU</TH>
            <TH>商品</TH>
            <TH className="text-right">現有庫存</TH>
            <TH>單位</TH>
            <TH className="text-right">補貨點</TH>
            <TH className="text-right">庫存價值</TH>
            <TH>狀態</TH>
          </tr>
        </THead>
        <tbody>
          {overview.length === 0 ? (
            <tr>
              <td colSpan={7}>
                <EmptyState message="尚無庫存資料。" />
              </td>
            </tr>
          ) : (
            overview.map((r) => (
              <TR key={r.itemId}>
                <TD className="font-mono text-xs">{r.sku}</TD>
                <TD className="font-medium text-gray-900">{r.name}</TD>
                <TD className={`text-right font-semibold ${r.isLow ? "text-red-600" : ""}`}>
                  {r.totalQty.toString()}
                </TD>
                <TD>{r.unit}</TD>
                <TD className="text-right">{r.reorderPoint.toString()}</TD>
                <TD className="text-right">{formatTWD(r.avgValue)}</TD>
                <TD>{r.isLow ? <Badge color="red">低庫存</Badge> : <Badge color="green">正常</Badge>}</TD>
              </TR>
            ))
          )}
        </tbody>
      </Table>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {canAdjust && (
          <Card>
            <CardHeader>
              <CardTitle>庫存調整（盤盈 / 盤虧）</CardTitle>
            </CardHeader>
            <CardContent>
              <AdjustForm warehouses={opts.warehouses} items={opts.items} />
            </CardContent>
          </Card>
        )}
        {canWaste && (
          <Card>
            <CardHeader>
              <CardTitle>報廢出庫</CardTitle>
            </CardHeader>
            <CardContent>
              <WasteForm warehouses={opts.warehouses} items={opts.items} />
            </CardContent>
          </Card>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>最近庫存異動</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <THead>
              <tr>
                <TH>時間</TH>
                <TH>商品</TH>
                <TH>類型</TH>
                <TH className="text-right">數量</TH>
                <TH className="text-right">異動後</TH>
                <TH>來源單號</TH>
              </tr>
            </THead>
            <tbody>
              {movements.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <EmptyState message="尚無異動紀錄。" />
                  </td>
                </tr>
              ) : (
                movements.map((m) => (
                  <TR key={m.id}>
                    <TD className="whitespace-nowrap text-xs text-gray-500">
                      {formatDateTime(m.occurredAt)}
                    </TD>
                    <TD>{m.item.name}</TD>
                    <TD>
                      <Badge color={m.direction > 0 ? "green" : "amber"}>
                        {STOCK_MOVEMENT_TYPE_LABELS[m.type]}
                      </Badge>
                    </TD>
                    <TD className="text-right">
                      {m.direction > 0 ? "+" : "-"}
                      {m.quantity.toString()}
                    </TD>
                    <TD className="text-right">{m.quantityAfter.toString()}</TD>
                    <TD className="text-xs text-gray-500">{m.sourceNo ?? m.sourceType ?? "—"}</TD>
                  </TR>
                ))
              )}
            </tbody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
