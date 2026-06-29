import { requirePermission, companyScope } from "@/lib/permissions";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/layout/page-header";
import { Table, THead, TH, TR, TD, EmptyState } from "@/components/ui/table";
import { formatDateTime } from "@/lib/dates";

export const dynamic = "force-dynamic";

export default async function AuditPage() {
  const actor = await requirePermission("audit.read");
  const scope = companyScope(actor);
  const logs = await prisma.auditLog.findMany({
    where: { companyId: scope.companyId },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return (
    <div>
      <PageHeader title="稽核紀錄" description="重要操作軌跡（最近 200 筆）" />
      {logs.length === 0 ? (
        <EmptyState message="尚無紀錄。" />
      ) : (
        <Table>
          <THead>
            <tr>
              <TH>時間</TH>
              <TH>動作</TH>
              <TH>對象</TH>
              <TH>對象 ID</TH>
              <TH>使用者</TH>
            </tr>
          </THead>
          <tbody>
            {logs.map((l) => (
              <TR key={l.id}>
                <TD className="whitespace-nowrap text-xs text-gray-500">
                  {formatDateTime(l.createdAt)}
                </TD>
                <TD className="font-medium text-gray-900">{l.action}</TD>
                <TD>{l.entityType}</TD>
                <TD className="font-mono text-xs text-gray-500">{l.entityId ?? "—"}</TD>
                <TD className="font-mono text-xs text-gray-500">{l.userId ?? "系統"}</TD>
              </TR>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
}
