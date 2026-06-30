import Link from "next/link";
import { requirePermission } from "@/lib/permissions";
import { listItems } from "@/modules/catalog/service";
import { PageHeader } from "@/components/layout/page-header";
import { Table, THead, TH, TR, TD, EmptyState, Badge } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { formatTWD } from "@/lib/money";
import { ITEM_TYPE_LABELS } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function MaterialsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const search = q?.trim() || undefined;
  const actor = await requirePermission("catalog.read");
  const items = await listItems(actor, {
    types: ["RAW_MATERIAL", "SEMI_FINISHED"],
    search,
  });
  const canManage = actor.permissions.has("catalog.manage");

  return (
    <div>
      <PageHeader
        title="原物料"
        description="原料與半成品（成品/銷售商品請見「商品」）"
        action={
          canManage ? (
            <Link href="/dashboard/items/new">
              <Button>新增原物料</Button>
            </Link>
          ) : null
        }
      />

      <form method="get" className="mb-4 flex gap-2">
        <input
          type="text"
          name="q"
          defaultValue={q ?? ""}
          placeholder="搜尋原物料名稱 / SKU…"
          className="h-10 w-full max-w-xs rounded-lg border border-gray-300 px-3 text-sm"
        />
        <Button type="submit">搜尋</Button>
        {search && (
          <Link
            href="/dashboard/materials"
            className="inline-flex h-10 items-center px-2 text-sm text-gray-500 hover:text-amber-700"
          >
            清除
          </Link>
        )}
      </form>

      {items.length === 0 ? (
        <EmptyState message={search ? `找不到符合「${search}」的原物料。` : "尚無原物料，請先新增。"} />
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
              {canManage && <TH></TH>}
            </tr>
          </THead>
          <tbody>
            {items.map((it) => (
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
                    <Link
                      href={`/dashboard/items/${it.id}/edit`}
                      className="text-amber-700 hover:underline"
                    >
                      編輯
                    </Link>
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
