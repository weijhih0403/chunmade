import { requirePermission, companyScope } from "@/lib/permissions";
import { prisma } from "@/lib/db";
import { listEmployees, listShifts, listSchedules } from "@/modules/hr/service";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, THead, TH, TR, TD, EmptyState, Badge } from "@/components/ui/table";
import { formatDate, formatDateTime } from "@/lib/dates";
import { ShiftForm, ScheduleForm, AutoScheduleForm } from "./schedule-forms";

export const dynamic = "force-dynamic";

export default async function SchedulePage() {
  const actor = await requirePermission("schedule.read");
  const scope = companyScope(actor);
  const [employees, shifts, schedules, stores] = await Promise.all([
    listEmployees(actor),
    listShifts(actor),
    listSchedules(actor),
    prisma.store.findMany({ where: { ...scope, deletedAt: null }, orderBy: { code: "asc" } }),
  ]);
  const canManage = actor.permissions.has("schedule.manage");

  return (
    <div className="space-y-4">
      <PageHeader title="排班" description="未來兩週班表；可手動排班或使用自動排班" />

      {canManage && (
        <div className="space-y-3">
          <Card>
            <CardHeader>
              <CardTitle>自動排班</CardTitle>
            </CardHeader>
            <CardContent>
              <AutoScheduleForm stores={stores.map((s) => ({ id: s.id, name: s.name }))} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>班別設定</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <ShiftForm />
              <div className="flex flex-wrap gap-2">
                {shifts.map((s) => (
                  <Badge key={s.id} color="blue">
                    {s.name} {s.startTime}-{s.endTime}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>新增排班</CardTitle>
            </CardHeader>
            <CardContent>
              <ScheduleForm
                employees={employees.map((e) => ({ id: e.id, name: e.name }))}
                shifts={shifts.map((s) => ({ id: s.id, name: s.name }))}
                stores={stores.map((s) => ({ id: s.id, name: s.name }))}
              />
            </CardContent>
          </Card>
        </div>
      )}

      {schedules.length === 0 ? (
        <EmptyState message="尚無排班。" />
      ) : (
        <Table>
          <THead>
            <tr>
              <TH>日期</TH>
              <TH>員工</TH>
              <TH>班別</TH>
              <TH>時間</TH>
            </tr>
          </THead>
          <tbody>
            {schedules.map((s) => (
              <TR key={s.id}>
                <TD>{formatDate(s.workDate)}</TD>
                <TD className="font-medium text-gray-900">{s.employee.name}</TD>
                <TD>{s.shift.name}</TD>
                <TD className="text-xs text-gray-500">
                  {formatDateTime(s.startAt, "HH:mm")} - {formatDateTime(s.endAt, "HH:mm")}
                </TD>
              </TR>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
}
