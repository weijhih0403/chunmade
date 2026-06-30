import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/permissions";
import { listWarehouseStock } from "@/modules/inventory/service";
import { BackButton } from "@/components/layout/back-button";
import { PageHeader } from "@/components/layout/page-header";
import { Table, THead, TH, TR, TD, EmptyState, Badge } from "@/components/ui/table";
import { formatTWD } from "@/lib/money";

export const dynamic = "force-dynamic";

export default async function WarehouseStockPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const actor = await requirePermission("inventory.read");
  const data = await listWarehouseStock(actor, id, {
    types: ["RAW_MATERIAL", "SEMI_FINISHED"],
  });
  if (!data) notFound();

  const { warehouse, rows } = data;
  const lowCount = rows.filter((r) => r.isLow).length;
  const storeName = warehouse.store?.name ?? "共用";

  return (
    <div className="space-y-4">
      <BackButton fallbackHref="/dashboard/org" />

      <PageHeader
        title={`原物料庫存 — ${warehouse.name}`}
        description={`所屬門市：${storeName}`}
      />

      {lowCount > 0 && (
        <div className="rounded-lg bg-amber-50 px-4 py-2 text-sm text-amber-800">
          有 <span className="font-bold">{lowCount}</span> 項原物料低於補貨點。
        </div>
      )}

      {rows.length === 0 ? (
        <EmptyState message="此倉庫尚無原物料資料。" />
      ) : (
        <Table>
          <THead>
            <tr>
              <TH>SKU</TH>
              <TH>名稱</TH>
              <TH className="text-right">現有庫存</TH>
              <TH>單位</TH>
              <TH className="text-right">補貨點</TH>
              <TH className="text-right">庫存價值</TH>
              <TH>狀態</TH>
            </tr>
          </THead>
          <tbody>
            {rows.map((r) => (
              <TR key={r.itemId}>
                <TD className="font-mono text-xs">{r.sku}</TD>
                <TD className="font-medium text-gray-900">{r.name}</TD>
                <TD className={`text-right font-semibold ${r.isLow ? "text-red-600" : ""}`}>
                  {r.qty.toString()}
                </TD>
                <TD>{r.unit}</TD>
                <TD className="text-right">{r.reorderPoint.toString()}</TD>
                <TD className="text-right">{formatTWD(r.avgValue)}</TD>
                <TD>
                  {r.isLow ? <Badge color="red">低庫存</Badge> : <Badge color="green">正常</Badge>}
                </TD>
              </TR>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
}
