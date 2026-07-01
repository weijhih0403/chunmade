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

const PAGE_SIZE = 50;

export default async function MaterialsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const { q, page: pageRaw } = await searchParams;
  const search = q?.trim() || undefined;
  const page = Math.max(1, Number(pageRaw) || 1);
  const actor = await requirePermission("catalog.read");
  const { items, total, pageSize } = await listItems(actor, {
    types: ["RAW_MATERIAL", "SEMI_FINISHED"],
    search,
    page,
    pageSize: PAGE_SIZE,
  });
  const canManage = actor.permissions.has("catalog.manage");
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  function pageHref(p: number) {
    const params = new URLSearchParams();
    if (search) params.set("q", search);
    if (p > 1) params.set("page", String(p));
    const qs = params.toString();
    return `/dashboard/materials${qs ? `?${qs}` : ""}`;
  }

  return (
    <div>
      <PageHeader
        title="原物料"
        description="原料與半成品（成品/銷售商品請見「商品」）"
        action={
          <div className="flex flex-wrap items-center gap-2">
            <form method="get" className="flex items-center gap-2">
              <input
                type="text"
                name="q"
                defaultValue={q ?? ""}
                placeholder="搜尋名稱 / SKU…"
                className="h-10 w-44 rounded-lg border border-gray-300 px-3 text-sm sm:w-56"
              />
              <Button type="submit" variant="outline">
                搜尋
              </Button>
              {search && (
                <Link
                  href="/dashboard/materials"
                  className="inline-flex h-10 items-center px-1 text-sm text-gray-500 hover:text-amber-700"
                >
                  清除
                </Link>
              )}
            </form>
            {canManage && (
              <Link href="/dashboard/items/new?from=materials">
                <Button>新增原物料</Button>
              </Link>
            )}
          </div>
        }
      />

      {total > 0 && (
        <p className="mb-3 text-sm text-gray-500">
          共 {total} 筆，第 {page} / {totalPages} 頁
        </p>
      )}

      {items.length === 0 ? (
        <EmptyState message={search ? `找不到符合「${search}」的原物料。` : "尚無原物料，請先新增。"} />
      ) : (
        <>
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
                      <div className="flex items-center gap-3">
                        <Link
                          href={`/dashboard/items/${it.id}/edit?from=materials`}
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
                            confirmMessage={`確定要刪除原物料「${it.name}」？`}
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

          {totalPages > 1 && (
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              {page > 1 && (
                <Link href={pageHref(page - 1)} className="rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50">
                  ← 上一頁
                </Link>
              )}
              <span className="text-sm text-gray-500">
                {page} / {totalPages}
              </span>
              {page < totalPages && (
                <Link href={pageHref(page + 1)} className="rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50">
                  下一頁 →
                </Link>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
