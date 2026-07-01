import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/permissions";
import { getRecipe } from "@/modules/production/service";
import { BackButton } from "@/components/layout/back-button";
import { PageHeader } from "@/components/layout/page-header";
import { Table, THead, TH, TR, TD, Badge } from "@/components/ui/table";

export const dynamic = "force-dynamic";

export default async function RecipeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const actor = await requirePermission("production.read");
  const data = await getRecipe(actor, id);
  if (!data) notFound();

  const { recipe, matMap } = data;
  const activeVersion = recipe.versions.find((v) => v.isActive) ?? recipe.versions[0];
  const canManage = actor.permissions.has("production.manage");

  return (
    <div className="space-y-4">
      <BackButton fallbackHref="/dashboard/recipes" />
      <PageHeader
        title={recipe.name}
        description={`產出：${recipe.product.name}（${recipe.product.sku}）`}
        action={
          canManage ? (
            <Link
              href={`/dashboard/recipes/${id}/edit`}
              className="inline-flex h-10 items-center rounded-lg bg-amber-600 px-4 text-sm font-medium text-white hover:bg-amber-700"
            >
              編輯配方
            </Link>
          ) : undefined
        }
      />

      <div className="flex flex-wrap gap-3 text-sm text-gray-600">
        <span>
          版本：<span className="font-medium text-gray-900">v{activeVersion?.version ?? "—"}</span>
        </span>
        <span>
          標準產量：
          <span className="font-medium text-gray-900">
            {activeVersion?.outputQty.toString() ?? "—"} {recipe.product.baseUnit.name}
          </span>
        </span>
        <span>
          狀態：{recipe.isActive ? <Badge color="green">啟用</Badge> : <Badge>停用</Badge>}
        </span>
      </div>

      {activeVersion ? (
        <Table>
          <THead>
            <tr>
              <TH>原料</TH>
              <TH className="text-right">標準用量</TH>
              <TH className="text-right">損耗率</TH>
            </tr>
          </THead>
          <tbody>
            {activeVersion.items.map((it) => {
              const mat = matMap.get(it.materialId);
              return (
                <TR key={it.id}>
                  <TD className="font-medium text-gray-900">
                    {mat?.name ?? it.materialId}
                    <span className="ml-1 text-xs text-gray-400">{mat?.baseUnit.name}</span>
                  </TD>
                  <TD className="text-right">{it.quantity.toString()}</TD>
                  <TD className="text-right">{it.wasteRate.toString()}</TD>
                </TR>
              );
            })}
          </tbody>
        </Table>
      ) : (
        <p className="text-sm text-gray-400">尚無配方版本。</p>
      )}
    </div>
  );
}
