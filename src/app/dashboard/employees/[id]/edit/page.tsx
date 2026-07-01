import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/permissions";
import { getEmployee, listDepartments, listShifts } from "@/modules/hr/service";
import { BackButton } from "@/components/layout/back-button";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmployeeForm } from "../../employee-form";
import { EmployeePreferenceForm } from "../../employee-preference-form";

export const dynamic = "force-dynamic";

export default async function EditEmployeePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const actor = await requirePermission("employee.manage");
  const [employee, departments, shifts] = await Promise.all([
    getEmployee(actor, id),
    listDepartments(actor),
    listShifts(actor),
  ]);
  if (!employee) notFound();

  return (
    <div className="space-y-4">
      <BackButton fallbackHref="/dashboard/employees" />
      <PageHeader title={`編輯員工 - ${employee.name}`} description={`編號：${employee.employeeNo}`} />
      <Card>
        <CardContent>
          <EmployeeForm
            departments={departments.map((d) => ({ id: d.id, name: d.name }))}
            defaults={{
              id: employee.id,
              employeeNo: employee.employeeNo,
              name: employee.name,
              phone: employee.phone,
              departmentId: employee.departmentId,
              hourlyRate: employee.hourlyRate?.toString() ?? "",
              hireDate: employee.hireDate?.toISOString().slice(0, 10) ?? "",
              minMonthlyShifts: employee.minMonthlyShifts,
              maxMonthlyShifts: employee.maxMonthlyShifts,
              isActive: employee.isActive,
            }}
          />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>可排班偏好</CardTitle>
        </CardHeader>
        <CardContent>
          <EmployeePreferenceForm
            employeeId={employee.id}
            shifts={shifts.map((s) => ({ id: s.id, name: s.name }))}
            preferences={employee.preferences.map((p) => ({
              weekday: p.weekday,
              shiftId: p.shiftId,
              available: p.available,
              preference: p.preference,
            }))}
          />
        </CardContent>
      </Card>
    </div>
  );
}
