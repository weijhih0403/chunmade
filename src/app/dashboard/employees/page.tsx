import Link from "next/link";
import { requirePermission } from "@/lib/permissions";
import { listEmployees, listDepartments } from "@/modules/hr/service";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Table, THead, TH, TR, TD, EmptyState, Badge } from "@/components/ui/table";
import { SuccessBanner } from "@/components/ui/success-banner";
import { EmployeeForm } from "./employee-form";
import { EmployeeDeleteForm } from "./employee-delete-form";

export const dynamic = "force-dynamic";

export default async function EmployeesPage({
  searchParams,
}: {
  searchParams: Promise<{ deleted?: string; transferred?: string; skipped?: string }>;
}) {
  const params = await searchParams;
  const actor = await requirePermission("employee.read");
  const [employees, departments] = await Promise.all([
    listEmployees(actor),
    listDepartments(actor),
  ]);
  const canManage = actor.permissions.has("employee.manage");

  const deleteMessage =
    params.deleted === "1"
      ? params.transferred !== undefined
        ? Number(params.transferred) > 0
          ? `員工已刪除，已轉移 ${params.transferred} 筆未來班表${
              Number(params.skipped) > 0
                ? `（${params.skipped} 筆因替換員工當日已有班而略過）`
                : ""
            }。`
          : "員工已刪除，該員工無未來班表需轉移。"
        : "員工已刪除。"
      : null;

  return (
    <div className="space-y-4">
      <PageHeader title="員工" description="員工基本資料與部門" />

      {deleteMessage && <SuccessBanner message={deleteMessage} />}

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
              {canManage && <TH>操作</TH>}
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
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                      <Link
                        href={`/dashboard/employees/${e.id}/edit`}
                        className="text-amber-700 hover:underline"
                      >
                        編輯
                      </Link>
                      <EmployeeDeleteForm
                        employeeId={e.id}
                        employeeName={e.name}
                        otherEmployees={employees
                          .filter((other) => other.id !== e.id && other.isActive)
                          .map((other) => ({
                            id: other.id,
                            name: other.name,
                            employeeNo: other.employeeNo,
                          }))}
                      />
                    </div>
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
