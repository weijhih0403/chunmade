import { requirePermission, companyScope } from "@/lib/permissions";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/layout/page-header";
import { RecipeForm } from "./recipe-form";

export const dynamic = "force-dynamic";

export default async function NewRecipePage() {
  const actor = await requirePermission("production.manage");
  const scope = companyScope(actor);
  const [products, materials] = await Promise.all([
    prisma.item.findMany({
      where: { ...scope, deletedAt: null, type: { in: ["SEMI_FINISHED", "FINISHED_GOOD"] } },
      select: { id: true, name: true, sku: true },
      orderBy: { name: "asc" },
    }),
    prisma.item.findMany({
      where: { ...scope, deletedAt: null, type: { in: ["RAW_MATERIAL", "SEMI_FINISHED"] } },
      select: { id: true, name: true, sku: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div>
      <PageHeader title="新增配方" description="定義產出品項與所需原料（BOM）" />
      <RecipeForm
        products={products.map((p) => ({ id: p.id, name: `${p.name}（${p.sku}）` }))}
        materials={materials.map((m) => ({ id: m.id, name: `${m.name}（${m.sku}）` }))}
      />
    </div>
  );
}
