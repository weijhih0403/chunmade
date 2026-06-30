import { requirePermission } from "@/lib/permissions";
import { getCatalogFormData } from "@/modules/catalog/service";
import { createItemAction } from "@/modules/catalog/actions";
import { BackButton } from "@/components/layout/back-button";
import { PageHeader } from "@/components/layout/page-header";
import { ItemForm } from "./item-form";

export const dynamic = "force-dynamic";

export default async function NewItemPage() {
  const actor = await requirePermission("catalog.manage");
  const { categories, units } = await getCatalogFormData(actor);

  return (
    <div className="space-y-4">
      <BackButton fallbackHref="/dashboard/items" />
      <PageHeader title="新增商品" description="建立原料 / 半成品 / 成品 / 銷售商品" />
      <ItemForm
        action={createItemAction}
        categories={categories.map((c) => ({ id: c.id, name: c.name }))}
        units={units.map((u) => ({ id: u.id, name: u.name }))}
      />
    </div>
  );
}
