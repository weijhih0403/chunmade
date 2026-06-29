import { requirePermission } from "@/lib/permissions";
import { listCategories } from "@/modules/catalog/service";
import { createCategoryAction } from "@/modules/catalog/actions";
import { PageHeader } from "@/components/layout/page-header";
import { Table, THead, TH, TR, TD, EmptyState } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { CodeNameForm } from "@/components/forms/code-name-form";

export const dynamic = "force-dynamic";

export default async function CategoriesPage() {
  const actor = await requirePermission("catalog.read");
  const categories = await listCategories(actor);
  const canManage = actor.permissions.has("catalog.manage");

  return (
    <div className="space-y-4">
      <PageHeader title="商品分類" description="管理商品分類" />

      {canManage && (
        <Card>
          <CardContent>
            <CodeNameForm action={createCategoryAction} codeLabel="分類代碼" />
          </CardContent>
        </Card>
      )}

      {categories.length === 0 ? (
        <EmptyState message="尚無分類。" />
      ) : (
        <Table>
          <THead>
            <tr>
              <TH>代碼</TH>
              <TH>名稱</TH>
            </tr>
          </THead>
          <tbody>
            {categories.map((c) => (
              <TR key={c.id}>
                <TD className="font-mono text-xs">{c.code}</TD>
                <TD className="font-medium text-gray-900">{c.name}</TD>
              </TR>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
}
