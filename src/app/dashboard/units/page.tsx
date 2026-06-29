import { requirePermission } from "@/lib/permissions";
import { listUnits } from "@/modules/catalog/service";
import { createUnitAction } from "@/modules/catalog/actions";
import { PageHeader } from "@/components/layout/page-header";
import { Table, THead, TH, TR, TD, EmptyState } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { CodeNameForm } from "@/components/forms/code-name-form";

export const dynamic = "force-dynamic";

export default async function UnitsPage() {
  const actor = await requirePermission("catalog.read");
  const units = await listUnits(actor);
  const canManage = actor.permissions.has("catalog.manage");

  return (
    <div className="space-y-4">
      <PageHeader title="單位" description="計量單位（個 / 公克 / 杯 …）" />

      {canManage && (
        <Card>
          <CardContent>
            <CodeNameForm action={createUnitAction} codeLabel="單位代碼" />
          </CardContent>
        </Card>
      )}

      {units.length === 0 ? (
        <EmptyState message="尚無單位。" />
      ) : (
        <Table>
          <THead>
            <tr>
              <TH>代碼</TH>
              <TH>名稱</TH>
            </tr>
          </THead>
          <tbody>
            {units.map((u) => (
              <TR key={u.id}>
                <TD className="font-mono text-xs">{u.code}</TD>
                <TD className="font-medium text-gray-900">{u.name}</TD>
              </TR>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
}
