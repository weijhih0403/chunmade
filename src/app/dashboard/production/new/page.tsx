import { requirePermission } from "@/lib/permissions";
import { getProducibleProducts } from "@/modules/production/service";
import { listWarehouses } from "@/modules/inventory/service";
import { PageHeader } from "@/components/layout/page-header";
import { ProductionForm } from "./production-form";

export const dynamic = "force-dynamic";

export default async function NewProductionPage() {
  const actor = await requirePermission("production.manage");
  const [recipes, warehouses] = await Promise.all([
    getProducibleProducts(actor),
    listWarehouses(actor),
  ]);

  return (
    <div>
      <PageHeader title="新增生產單" description="依配方計畫生產，系統自動展開所需原料" />
      <ProductionForm
        recipes={recipes.map((r) => ({
          versionId: r.versionId,
          label: `${r.productName}（v${r.version}，標準產量 ${r.outputQty.toString()}）`,
        }))}
        warehouses={warehouses.map((w) => ({ id: w.id, name: w.name }))}
      />
    </div>
  );
}
