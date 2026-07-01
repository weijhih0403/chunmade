import { requirePermission } from "@/lib/permissions";
import { getCatalogFormData } from "@/modules/catalog/service";
import { createItemAction } from "@/modules/catalog/actions";
import { BackButton } from "@/components/layout/back-button";
import { PageHeader } from "@/components/layout/page-header";
import { ItemForm } from "./item-form";

export const dynamic = "force-dynamic";

export default async function NewItemPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  const { from } = await searchParams;
  const fromMaterials = from === "materials";
  const actor = await requirePermission("catalog.manage");
  const { categories, units, suppliers } = await getCatalogFormData(actor);

  return (
    <div className="space-y-4">
      <BackButton fallbackHref={fromMaterials ? "/dashboard/materials" : "/dashboard/items"} />
      <PageHeader
        title={fromMaterials ? "新增原物料" : "新增商品"}
        description={
          fromMaterials
            ? "建立原料或半成品"
            : "建立成品 / 銷售商品 / 服務項目"
        }
      />
      <ItemForm
        action={createItemAction}
        defaultType={fromMaterials ? "RAW_MATERIAL" : "SALE_ITEM"}
        materialMode={fromMaterials}
        returnTo={fromMaterials ? "/dashboard/materials" : "/dashboard/items"}
        categories={categories.map((c) => ({ id: c.id, name: c.name }))}
        units={units.map((u) => ({ id: u.id, name: u.name }))}
        suppliers={suppliers.map((s) => ({ id: s.id, name: s.name }))}
      />
    </div>
  );
}
