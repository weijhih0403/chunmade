import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/permissions";
import { getItem, getCatalogFormData } from "@/modules/catalog/service";
import { updateItemAction } from "@/modules/catalog/actions";
import { BackButton } from "@/components/layout/back-button";
import { PageHeader } from "@/components/layout/page-header";
import { ItemForm } from "../../new/item-form";

export const dynamic = "force-dynamic";

export default async function EditItemPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string }>;
}) {
  const { id } = await params;
  const { from } = await searchParams;
  const fromMaterials = from === "materials";
  const actor = await requirePermission("catalog.manage");
  const [item, { categories, units }] = await Promise.all([
    getItem(actor, id),
    getCatalogFormData(actor),
  ]);
  if (!item) notFound();

  return (
    <div className="space-y-4">
      <BackButton fallbackHref={fromMaterials ? "/dashboard/materials" : "/dashboard/items"} />
      <PageHeader title={`編輯 - ${item.name}`} description={`SKU：${item.sku}`} />
      <ItemForm
        action={updateItemAction}
        submitLabel="儲存變更"
        returnTo={fromMaterials ? "/dashboard/materials" : "/dashboard/items"}
        categories={categories.map((c) => ({ id: c.id, name: c.name }))}
        units={units.map((u) => ({ id: u.id, name: u.name }))}
        defaults={{
          id: item.id,
          sku: item.sku,
          barcode: item.barcode,
          name: item.name,
          type: item.type,
          categoryId: item.categoryId,
          baseUnitId: item.baseUnitId,
          price: item.price.toString(),
          standardCost: item.standardCost.toString(),
          safetyStock: item.safetyStock.toString(),
          reorderPoint: item.reorderPoint.toString(),
          shelfLifeDays: item.shelfLifeDays,
          trackStock: item.trackStock,
        }}
      />
    </div>
  );
}
