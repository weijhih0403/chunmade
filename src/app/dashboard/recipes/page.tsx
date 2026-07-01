import Link from "next/link";
import { requirePermission } from "@/lib/permissions";
import { listRecipes } from "@/modules/production/service";
import { PageHeader } from "@/components/layout/page-header";
import { Table, THead, TH, TR, TD, EmptyState, Badge } from "@/components/ui/table";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function RecipesPage() {
  const actor = await requirePermission("production.read");
  const recipes = await listRecipes(actor);
  const canManage = actor.permissions.has("production.manage");

  return (
    <div>
      <PageHeader
        title="配方 / BOM"
        description="手作食品配方與用料"
        action={
          canManage ? (
            <Link href="/dashboard/recipes/new">
              <Button>新增配方</Button>
            </Link>
          ) : null
        }
      />
      {recipes.length === 0 ? (
        <EmptyState message="尚無配方。" />
      ) : (
        <Table>
          <THead>
            <tr>
              <TH>配方名稱</TH>
              <TH>產出品項</TH>
              <TH>版本數</TH>
              <TH>狀態</TH>
              <TH></TH>
            </tr>
          </THead>
          <tbody>
            {recipes.map((r) => (
              <TR key={r.id}>
                <TD className="font-medium text-gray-900">
                  <Link href={`/dashboard/recipes/${r.id}`} className="hover:text-amber-700">
                    {r.name}
                  </Link>
                </TD>
                <TD>{r.product.name}</TD>
                <TD>{r.versions.length}</TD>
                <TD>{r.isActive ? <Badge color="green">啟用</Badge> : <Badge>停用</Badge>}</TD>
                <TD>
                  <Link href={`/dashboard/recipes/${r.id}`} className="text-amber-700 hover:underline">
                    開啟
                  </Link>
                </TD>
              </TR>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
}
