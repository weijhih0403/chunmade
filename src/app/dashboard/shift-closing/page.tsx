import { requireAnyPermission } from "@/lib/permissions";
import { formatDate } from "@/lib/dates";
import {
  listShiftClosingReports,
  listShiftClosingStores,
} from "@/modules/shift-closing/service";
import { PageHeader } from "@/components/layout/page-header";
import { ShiftClosingWizard } from "./shift-closing-wizard";
import { ShiftClosingReportList } from "./shift-closing-report-list";

export const dynamic = "force-dynamic";

export default async function ShiftClosingPage() {
  const actor = await requireAnyPermission(["sales.shift", "sales.read"]);
  const canSubmit = actor.permissions.has("sales.shift");
  const today = formatDate(new Date());

  const [stores, reports] = await Promise.all([
    listShiftClosingStores(actor),
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
          defaultDate={today}
        />
      ) : (
        <p className="text-sm text-gray-500">您目前僅能查看紀錄，無法填寫班結表。</p>
      )}

      <div>
        <h2 className="mb-3 text-lg font-semibold text-gray-900">近期班結紀錄</h2>
        <ShiftClosingReportList reports={reports} />
      </div>
    </div>
  );
}
