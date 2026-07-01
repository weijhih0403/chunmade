import { notFound } from "next/navigation";
import { requirePermission, companyScope } from "@/lib/permissions";
import { prisma } from "@/lib/db";
import { getRecipe } from "@/modules/production/service";
import { BackButton } from "@/components/layout/back-button";
import { PageHeader } from "@/components/layout/page-header";
import { RecipeForm } from "../../new/recipe-form";

export const dynamic = "force-dynamic";

export default async function EditRecipePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const actor = await requirePermission("production.manage");
  const scope = companyScope(actor);
  const data = await getRecipe(actor, id);
  if (!data) notFound();

  const { recipe } = data;
  const activeVersion = recipe.versions.find((v) => v.isActive) ?? recipe.versions[0];
  if (!activeVersion) notFound();

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
    <div className="space-y-4">
      <BackButton fallbackHref={`/dashboard/recipes/${id}`} />
      <PageHeader title={`編輯配方 - ${recipe.name}`} description="儲存後會建立新版本" />
      <RecipeForm
        products={products.map((p) => ({ id: p.id, name: `${p.name}（${p.sku}）` }))}
        materials={materials.map((m) => ({ id: m.id, name: `${m.name}（${m.sku}）` }))}
        defaults={{
          id: recipe.id,
          productId: recipe.productId,
          name: recipe.name,
          outputQty: activeVersion.outputQty.toString(),
          lines: activeVersion.items.map((it) => ({
            materialId: it.materialId,
            quantity: Number(it.quantity),
            wasteRate: Number(it.wasteRate),
          })),
        }}
      />
    </div>
  );
}
