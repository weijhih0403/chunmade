import { requirePermission, companyScope } from "@/lib/permissions";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, THead, TH, TR, TD, EmptyState, Badge } from "@/components/ui/table";

export const dynamic = "force-dynamic";

export default async function OrgPage() {
  const actor = await requirePermission("org.read");
  const scope = companyScope(actor);
  const [stores, warehouses] = await Promise.all([
    prisma.store.findMany({ where: { ...scope, deletedAt: null }, orderBy: { code: "asc" } }),
    prisma.warehouse.findMany({
      where: { ...scope, deletedAt: null },
      include: { store: { select: { name: true } } },
      orderBy: { code: "asc" },
    }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader title="門市 / 倉庫" description="組織據點" />

      <Card>
        <CardHeader>
          <CardTitle>門市</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <THead>
              <tr>
                <TH>代碼</TH>
                <TH>名稱</TH>
                <TH>電話</TH>
                <TH>狀態</TH>
              </tr>
            </THead>
            <tbody>
              {stores.length === 0 ? (
                <tr>
                  <td colSpan={4}>
                    <EmptyState message="尚無門市。" />
                  </td>
                </tr>
              ) : (
                stores.map((s) => (
                  <TR key={s.id}>
                    <TD className="font-mono text-xs">{s.code}</TD>
                    <TD className="font-medium text-gray-900">{s.name}</TD>
                    <TD>{s.phone ?? "—"}</TD>
                    <TD>{s.isActive ? <Badge color="green">啟用</Badge> : <Badge>停用</Badge>}</TD>
                  </TR>
                ))
              )}
            </tbody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>倉庫</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <THead>
              <tr>
                <TH>代碼</TH>
                <TH>名稱</TH>
                <TH>所屬門市</TH>
                <TH>狀態</TH>
              </tr>
            </THead>
            <tbody>
              {warehouses.length === 0 ? (
                <tr>
                  <td colSpan={4}>
                    <EmptyState message="尚無倉庫。" />
                  </td>
                </tr>
              ) : (
                warehouses.map((w) => (
                  <TR key={w.id}>
                    <TD className="font-mono text-xs">{w.code}</TD>
                    <TD className="font-medium text-gray-900">{w.name}</TD>
                    <TD>{w.store?.name ?? "共用"}</TD>
                    <TD>{w.isActive ? <Badge color="green">啟用</Badge> : <Badge>停用</Badge>}</TD>
                  </TR>
                ))
              )}
            </tbody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
