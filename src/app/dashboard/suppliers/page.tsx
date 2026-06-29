import { requirePermission } from "@/lib/permissions";
import { listSuppliers } from "@/modules/purchasing/service";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Table, THead, TH, TR, TD, EmptyState } from "@/components/ui/table";
import { SupplierForm } from "./supplier-form";

export const dynamic = "force-dynamic";

export default async function SuppliersPage() {
  const actor = await requirePermission("purchase.read");
  const suppliers = await listSuppliers(actor);
  const canManage = actor.permissions.has("purchase.manage");

  return (
    <div className="space-y-4">
      <PageHeader title="供應商" description="管理採購供應商" />

      {canManage && (
        <Card>
          <CardContent>
            <SupplierForm />
          </CardContent>
        </Card>
      )}

      {suppliers.length === 0 ? (
        <EmptyState message="尚無供應商。" />
      ) : (
        <Table>
          <THead>
            <tr>
              <TH>代碼</TH>
              <TH>名稱</TH>
              <TH>聯絡人</TH>
              <TH>電話</TH>
            </tr>
          </THead>
          <tbody>
            {suppliers.map((s) => (
              <TR key={s.id}>
                <TD className="font-mono text-xs">{s.code}</TD>
                <TD className="font-medium text-gray-900">{s.name}</TD>
                <TD>{s.contact ?? "—"}</TD>
                <TD>{s.phone ?? "—"}</TD>
              </TR>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
}
