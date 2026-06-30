import { requireAnyPermission } from "@/lib/permissions";
import {
  listEmployees,
  listAttendances,
  listLeaves,
  getActiveQrToken,
} from "@/modules/hr/service";
import { generateQrTokenAction, approveLeaveAction } from "@/modules/hr/actions";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, THead, TH, TR, TD, EmptyState, Badge } from "@/components/ui/table";
import { SubmitButton } from "@/components/ui/submit-button";
import { formatDateTime } from "@/lib/dates";
import { ClockForm, LeaveForm } from "./attendance-forms";

export const dynamic = "force-dynamic";

const LEAVE_STATUS: Record<string, { label: string; color: "amber" | "green" | "red" }> = {
  PENDING: { label: "待審", color: "amber" },
  APPROVED: { label: "已核准", color: "green" },
  REJECTED: { label: "已駁回", color: "red" },
  CANCELLED: { label: "已取消", color: "red" },
};

export default async function AttendancePage() {
  const actor = await requireAnyPermission(["attendance.read", "attendance.clock"]);
  const [employees, attendances, leaves, token] = await Promise.all([
    listEmployees(actor),
    listAttendances(actor),
    listLeaves(actor),
    getActiveQrToken(actor),
  ]);
  const empOpts = employees.map((e) => ({ id: e.id, name: e.name }));
  const canManage = actor.permissions.has("attendance.manage");
  const canApprove = actor.permissions.has("leave.approve");
  const canClock = actor.permissions.has("attendance.clock");
  const storeId = actor.storeIds[0] ?? "";

  return (
    <div className="space-y-6">
      <PageHeader title="出勤打卡" description="動態 QR 打卡碼、當日出勤與請假" />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {canManage && (
          <Card>
            <CardHeader>
              <CardTitle>動態打卡碼</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <form action={generateQrTokenAction}>
                <input type="hidden" name="storeId" value={storeId} />
                <SubmitButton pendingText="產生中…">產生新打卡碼（90 秒）</SubmitButton>
              </form>
              {token ? (
                <div className="rounded-lg bg-gray-900 p-4 text-center">
                  <p className="text-xs text-gray-400">目前打卡碼</p>
                  <p className="break-all font-mono text-lg text-amber-300">{token.token}</p>
                  <p className="mt-1 text-xs text-gray-400">
                    到期：{formatDateTime(token.expiresAt, "HH:mm:ss")}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-gray-400">目前沒有有效打卡碼。</p>
              )}
              <p className="text-xs text-gray-400">
                門市現場可將打卡碼產生為 QR 顯示，員工掃描後於下方打卡。
              </p>
            </CardContent>
          </Card>
        )}

        {canClock && (
          <Card>
            <CardHeader>
              <CardTitle>打卡</CardTitle>
            </CardHeader>
            <CardContent>
              <ClockForm employees={empOpts} token={token?.token ?? null} />
            </CardContent>
          </Card>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>當日出勤</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <THead>
              <tr>
                <TH>員工</TH>
                <TH>上班</TH>
                <TH>下班</TH>
                <TH>狀態</TH>
              </tr>
            </THead>
            <tbody>
              {attendances.length === 0 ? (
                <tr>
                  <td colSpan={4}>
                    <EmptyState message="今日尚無出勤紀錄。" />
                  </td>
                </tr>
              ) : (
                attendances.map((a) => (
                  <TR key={a.id}>
                    <TD className="font-medium text-gray-900">{a.employee.name}</TD>
                    <TD>{a.clockInAt ? formatDateTime(a.clockInAt, "HH:mm:ss") : "—"}</TD>
                    <TD>{a.clockOutAt ? formatDateTime(a.clockOutAt, "HH:mm:ss") : "—"}</TD>
                    <TD>
                      <Badge color={a.clockOutAt ? "green" : "amber"}>
                        {a.clockOutAt ? "已下班" : a.clockInAt ? "上班中" : "未打卡"}
                      </Badge>
                    </TD>
                  </TR>
                ))
              )}
            </tbody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>請假申請</CardTitle>
          </CardHeader>
          <CardContent>
            <LeaveForm employees={empOpts} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>請假紀錄</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <THead>
                <tr>
                  <TH>員工</TH>
                  <TH>假別</TH>
                  <TH className="text-right">時數</TH>
                  <TH>狀態</TH>
                  {canApprove && <TH></TH>}
                </tr>
              </THead>
              <tbody>
                {leaves.length === 0 ? (
                  <tr>
                    <td colSpan={canApprove ? 5 : 4}>
                      <EmptyState message="尚無請假紀錄。" />
                    </td>
                  </tr>
                ) : (
                  leaves.map((l) => (
                    <TR key={l.id}>
                      <TD className="font-medium text-gray-900">{l.employee.name}</TD>
                      <TD>{l.type}</TD>
                      <TD className="text-right">{l.hours.toString()}</TD>
                      <TD>
                        <Badge color={LEAVE_STATUS[l.status]?.color ?? "amber"}>
                          {LEAVE_STATUS[l.status]?.label ?? l.status}
                        </Badge>
                      </TD>
                      {canApprove && (
                        <TD>
                          {l.status === "PENDING" && (
                            <div className="flex gap-1">
                              <form action={approveLeaveAction}>
                                <input type="hidden" name="id" value={l.id} />
                                <input type="hidden" name="decision" value="APPROVE" />
                                <button className="text-green-600 hover:underline">核准</button>
                              </form>
                              <form action={approveLeaveAction}>
                                <input type="hidden" name="id" value={l.id} />
                                <input type="hidden" name="decision" value="REJECT" />
                                <button className="text-red-600 hover:underline">駁回</button>
                              </form>
                            </div>
                          )}
                        </TD>
                      )}
                    </TR>
                  ))
                )}
              </tbody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
