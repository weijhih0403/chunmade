import { requirePermission, companyScope } from "@/lib/permissions";
import { listSuppliers } from "@/modules/purchasing/service";
import { listWarehouses } from "@/modules/inventory/service";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/layout/page-header";
import { PurchaseOrderForm } from "./po-form";

export const dynamic = "force-dynamic";

export default async function NewPurchaseOrderPage() {
  const actor = await requirePermission("purchase.manage");
  const scope = companyScope(actor);
  const [suppliers, warehouses, items] = await Promise.all([
    listSuppliers(actor),
    listWarehouses(actor),
    prisma.item.findMany({
      where: { ...scope, deletedAt: null, type: { in: ["RAW_MATERIAL", "SEMI_FINISHED"] } },
      select: { id: true, name: true, sku: true, standardCost: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div>
      <PageHeader title="新增採購單" description="向供應商採購原料 / 半成品" />
      <PurchaseOrderForm
        suppliers={suppliers.map((s) => ({ id: s.id, name: s.name }))}
        warehouses={warehouses.map((w) => ({ id: w.id, name: w.name }))}
        items={items.map((i) => ({
          id: i.id,
          name: `${i.name}（${i.sku}）`,
          cost: Number(i.standardCost),
        }))}
      />
    </div>
  );
}
