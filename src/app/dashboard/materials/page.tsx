import Link from "next/link";
import { requirePermission } from "@/lib/permissions";
import { listItems } from "@/modules/catalog/service";
import { PageHeader } from "@/components/layout/page-header";
import { ItemCatalogList } from "@/components/catalog/item-catalog-list";
import { EmptyState } from "@/components/ui/table";
import { Button } from "@/components/ui/button";

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
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center">
            <form method="get" className="flex w-full flex-col gap-2 sm:flex-row sm:items-center">
              <input
                type="text"
                name="q"
                defaultValue={q ?? ""}
                placeholder="搜尋名稱 / SKU…"
                className="h-10 w-full rounded-lg border border-gray-300 px-3 text-sm sm:w-56"
              />
              <div className="flex gap-2">
                <Button type="submit" variant="outline" className="flex-1 sm:flex-none">
                  搜尋
                </Button>
                {search && (
                  <Link
                    href="/dashboard/materials"
                    className="inline-flex h-10 flex-1 items-center justify-center rounded-lg border border-gray-300 px-3 text-sm text-gray-600 hover:bg-gray-50 sm:flex-none sm:border-0 sm:px-1"
                  >
                    清除
                  </Link>
                )}
              </div>
            </form>
            {canManage && (
              <Link href="/dashboard/items/new?from=materials" className="block w-full sm:w-auto">
                <Button className="w-full sm:w-auto">新增原物料</Button>
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
          <ItemCatalogList items={items} canManage={canManage} from="materials" />

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
