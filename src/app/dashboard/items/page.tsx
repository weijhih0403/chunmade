import Link from "next/link";
import { requirePermission } from "@/lib/permissions";
import { listItems } from "@/modules/catalog/service";
import { deleteItemAction } from "@/modules/catalog/actions";
import { PageHeader } from "@/components/layout/page-header";
import { Table, THead, TH, TR, TD, EmptyState, Badge } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";
import { formatTWD } from "@/lib/money";
import { ITEM_TYPE_LABELS } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function ItemsPage() {
  const actor = await requirePermission("catalog.read");
  const items = await listItems(actor, {
    types: ["FINISHED_GOOD", "SALE_ITEM", "SERVICE"],
  });
  const rows = items.items;
  const canManage = actor.permissions.has("catalog.manage");

  return (
    <div>
      <PageHeader
        title="商品主檔"
        description="成品、銷售商品與服務項目（原料/半成品請見「原物料」）"
        action={
          canManage ? (
            <Link href="/dashboard/items/new">
              <Button>新增商品</Button>
            </Link>
          ) : null
        }
      />

      {rows.length === 0 ? (
        <EmptyState message="尚無商品，請先新增。" />
      ) : (
        <Table>
          <THead>
            <tr>
              <TH>SKU</TH>
              <TH>名稱</TH>
              <TH>類型</TH>
              <TH>分類</TH>
              <TH>單位</TH>
              <TH className="text-right">售價</TH>
              <TH className="text-right">標準成本</TH>
              <TH>庫管</TH>
              {canManage && <TH>操作</TH>}
            </tr>
          </THead>
          <tbody>
            {rows.map((it) => (
              <TR key={it.id}>
                <TD className="font-mono text-xs">{it.sku}</TD>
                <TD className="font-medium text-gray-900">{it.name}</TD>
                <TD>
                  <Badge color="blue">{ITEM_TYPE_LABELS[it.type]}</Badge>
                </TD>
                <TD>{it.category?.name ?? "—"}</TD>
                <TD>{it.baseUnit.name}</TD>
                <TD className="text-right">{formatTWD(it.price)}</TD>
                <TD className="text-right">{formatTWD(it.standardCost)}</TD>
                <TD>
                  {it.trackStock ? <Badge color="green">管理</Badge> : <Badge>不管理</Badge>}
                </TD>
                {canManage && (
                  <TD>
                    <div className="flex items-center gap-3">
                      <Link
                        href={`/dashboard/items/${it.id}/edit`}
                        className="text-amber-700 hover:underline"
                      >
                        編輯
                      </Link>
                      <form action={deleteItemAction}>
                        <input type="hidden" name="itemId" value={it.id} />
                        <ConfirmSubmitButton
                          variant="ghost"
                          size="sm"
                          pendingText="刪除中…"
                          confirmMessage={`確定要刪除商品「${it.name}」？`}
                        >
                          <span className="text-red-600">刪除</span>
                        </ConfirmSubmitButton>
                      </form>
                    </div>
                  </TD>
                )}
              </TR>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
}
