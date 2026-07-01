import Link from "next/link";
import { requirePermission } from "@/lib/permissions";
import { listItems } from "@/modules/catalog/service";
import { PageHeader } from "@/components/layout/page-header";
import { ItemCatalogList } from "@/components/catalog/item-catalog-list";
import { EmptyState } from "@/components/ui/table";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function ItemsPage() {
  const actor = await requirePermission("catalog.read");
  const { items: rows } = await listItems(actor, {
    types: ["FINISHED_GOOD", "SALE_ITEM", "SERVICE"],
  });
  const canManage = actor.permissions.has("catalog.manage");

  return (
    <div>
      <PageHeader
        title="商品主檔"
        description="成品、銷售商品與服務項目（原料/半成品請見「原物料」）"
        action={
          canManage ? (
            <Link href="/dashboard/items/new" className="block w-full sm:w-auto">
              <Button className="w-full sm:w-auto">新增商品</Button>
            </Link>
          ) : null
        }
      />

      {rows.length === 0 ? (
        <EmptyState message="尚無商品，請先新增。" />
      ) : (
        <ItemCatalogList items={rows} canManage={canManage} />
      )}
    </div>
  );
}
