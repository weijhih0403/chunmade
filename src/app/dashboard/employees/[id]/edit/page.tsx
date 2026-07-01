import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/permissions";
import { getEmployee, listDepartments } from "@/modules/hr/service";
import { BackButton } from "@/components/layout/back-button";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { EmployeeForm } from "../../employee-form";

export const dynamic = "force-dynamic";

export default async function EditEmployeePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const actor = await requirePermission("employee.manage");
  const [employee, departments] = await Promise.all([
    getEmployee(actor, id),
    listDepartments(actor),
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
              isActive: employee.isActive,
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
