import Link from "next/link";
import { requireAnyPermission } from "@/lib/permissions";
import { formatDate, formatDateTime } from "@/lib/dates";
import {
  listShiftClosingEmployees,
  listShiftClosingReports,
  listShiftClosingStores,
} from "@/modules/shift-closing/service";
import { PageHeader } from "@/components/layout/page-header";
import { Table, THead, TH, TR, TD, EmptyState } from "@/components/ui/table";
import { ShiftClosingWizard } from "./shift-closing-wizard";

export const dynamic = "force-dynamic";

export default async function ShiftClosingPage() {
  const actor = await requireAnyPermission(["sales.shift", "sales.read"]);
  const canSubmit = actor.permissions.has("sales.shift");
  const today = formatDate(new Date());

  const [stores, employees, reports] = await Promise.all([
    listShiftClosingStores(actor),
    listShiftClosingEmployees(actor),
    listShiftClosingReports(actor),
  ]);

  return (
    <div className="space-y-8">
      <PageHeader
        title="班結表"
        description="登記班末容器數量並保存手寫簽名"
      />

      {canSubmit ? (
        <ShiftClosingWizard
          stores={stores.map((s) => ({ id: s.id, name: s.name }))}
          employees={employees}
          defaultDate={today}
        />
      ) : (
        <p className="text-sm text-gray-500">您目前僅能查看紀錄，無法填寫班結表。</p>
      )}

      <div>
        <h2 className="mb-3 text-lg font-semibold text-gray-900">近期班結紀錄</h2>
        <Table>
          <THead>
            <tr>
              <TH>單號</TH>
              <TH>門市</TH>
              <TH>日期</TH>
              <TH>520碗</TH>
              <TH>850碗</TH>
              <TH>700杯</TH>
              <TH>500杯</TH>
              <TH>簽名人</TH>
              <TH>時間</TH>
            </tr>
          </THead>
          <tbody>
            {reports.length === 0 ? (
              <tr>
                <td colSpan={9}>
                  <EmptyState message="尚無班結紀錄。" />
                </td>
              </tr>
            ) : (
              reports.map((r) => (
                <TR key={r.id}>
                  <TD className="font-mono text-xs">
                    <Link
                      href={`/dashboard/shift-closing/${r.id}`}
                      className="text-amber-700 hover:underline"
                    >
                      {r.reportNo}
                    </Link>
                  </TD>
                  <TD>{r.store.name}</TD>
                  <TD className="text-xs">{formatDate(r.closingDate)}</TD>
                  <TD className="text-right">{r.qty520}</TD>
                  <TD className="text-right">{r.qty850}</TD>
                  <TD className="text-right">{r.qty700}</TD>
                  <TD className="text-right">{r.qty500}</TD>
                  <TD>{r.signerName ?? "—"}</TD>
                  <TD className="text-xs text-gray-500">{formatDateTime(r.createdAt)}</TD>
                </TR>
              ))
            )}
          </tbody>
        </Table>
      </div>
    </div>
  );
}
