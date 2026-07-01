import Link from "next/link";
import { requirePermission } from "@/lib/permissions";
import { listEmployees, listDepartments } from "@/modules/hr/service";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Table, THead, TH, TR, TD, EmptyState, Badge } from "@/components/ui/table";
import { EmployeeForm } from "./employee-form";

export const dynamic = "force-dynamic";

export default async function EmployeesPage() {
  const actor = await requirePermission("employee.read");
  const [employees, departments] = await Promise.all([
    listEmployees(actor),
    listDepartments(actor),
  ]);
  const canManage = actor.permissions.has("employee.manage");

  return (
    <div className="space-y-4">
      <PageHeader title="員工" description="員工基本資料與部門" />

      {canManage && (
        <Card>
          <CardContent>
            <EmployeeForm departments={departments.map((d) => ({ id: d.id, name: d.name }))} />
          </CardContent>
        </Card>
      )}

      {employees.length === 0 ? (
        <EmptyState message="尚無員工。" />
      ) : (
        <Table>
          <THead>
            <tr>
              <TH>編號</TH>
              <TH>姓名</TH>
              <TH>部門</TH>
              <TH>電話</TH>
              <TH>狀態</TH>
              {canManage && <TH></TH>}
            </tr>
          </THead>
          <tbody>
            {employees.map((e) => (
              <TR key={e.id}>
                <TD className="font-mono text-xs">{e.employeeNo}</TD>
                <TD className="font-medium text-gray-900">{e.name}</TD>
                <TD>{e.department?.name ?? "—"}</TD>
                <TD>{e.phone ?? "—"}</TD>
                <TD>{e.isActive ? <Badge color="green">在職</Badge> : <Badge>停用</Badge>}</TD>
                {canManage && (
                  <TD>
                    <Link
                      href={`/dashboard/employees/${e.id}/edit`}
                      className="text-amber-700 hover:underline"
                    >
                      編輯
                    </Link>
                  </TD>
                )}
              </TR>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
}
