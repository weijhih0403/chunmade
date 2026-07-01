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
              <TH className="w-[14%]">SKU</TH>
              <TH className="w-[18%]">名稱</TH>
              <TH className="w-[10%]">類型</TH>
              <TH className="w-[12%]">分類</TH>
              <TH className="w-[6%]">單位</TH>
              <TH className="w-[8%] text-right">售價</TH>
              <TH className="w-[8%] text-right">標準成本</TH>
              <TH className="w-[8%]">庫管</TH>
              {canManage && <TH className="w-[16%]">操作</TH>}
            </tr>
          </THead>
          <tbody>
            {rows.map((it) => (
              <TR key={it.id}>
                <TD className="truncate font-mono text-xs" title={it.sku}>
                  {it.sku}
                </TD>
                <TD className="font-medium text-gray-900">
                  <span className="line-clamp-2 whitespace-normal">{it.name}</span>
                </TD>
                <TD>
                  <Badge color="blue">{ITEM_TYPE_LABELS[it.type]}</Badge>
                </TD>
                <TD className="truncate">{it.category?.name ?? "—"}</TD>
                <TD className="whitespace-nowrap">{it.baseUnit.name}</TD>
                <TD className="whitespace-nowrap text-right">{formatTWD(it.price)}</TD>
                <TD className="whitespace-nowrap text-right">{formatTWD(it.standardCost)}</TD>
                <TD>
                  {it.trackStock ? <Badge color="green">管理</Badge> : <Badge>不管理</Badge>}
                </TD>
                {canManage && (
                  <TD className="whitespace-nowrap">
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
