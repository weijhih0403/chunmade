import { requirePermission } from "@/lib/permissions";
import { getCatalogFormData } from "@/modules/catalog/service";
import { PageHeader } from "@/components/layout/page-header";
import { ItemForm } from "./item-form";

export const dynamic = "force-dynamic";

export default async function NewItemPage() {
  const actor = await requirePermission("catalog.manage");
  const { categories, units } = await getCatalogFormData(actor);

  return (
    <div>
      <PageHeader title="新增商品" description="建立原料 / 半成品 / 成品 / 銷售商品" />
      <ItemForm
        categories={categories.map((c) => ({ id: c.id, name: c.name }))}
        units={units.map((u) => ({ id: u.id, name: u.name }))}
      />
    </div>
  );
}
