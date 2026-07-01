import { notFound } from "next/navigation";
import { requireAnyPermission } from "@/lib/permissions";
import { formatDate, formatDateTime } from "@/lib/dates";
import { getShiftClosingReport } from "@/modules/shift-closing/service";
import { BackButton } from "@/components/layout/back-button";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function ShiftClosingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const actor = await requireAnyPermission(["sales.shift", "sales.read"]);
  const report = await getShiftClosingReport(actor, id);
  if (!report) notFound();

  return (
    <div className="space-y-4">
      <BackButton fallbackHref="/dashboard/shift-closing" />
      <PageHeader
        title={`班結表 ${report.reportNo}`}
        description={`${report.store.name} · ${formatDate(report.closingDate)}`}
      />

      <Card className="p-4">
        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <dt className="text-xs text-gray-400">520 碗</dt>
            <dd className="text-xl font-semibold">{report.qty520}</dd>
          </div>
          <div>
            <dt className="text-xs text-gray-400">850 碗</dt>
            <dd className="text-xl font-semibold">{report.qty850}</dd>
          </div>
          <div>
            <dt className="text-xs text-gray-400">700 杯</dt>
            <dd className="text-xl font-semibold">{report.qty700}</dd>
          </div>
          <div>
            <dt className="text-xs text-gray-400">500 杯</dt>
            <dd className="text-xl font-semibold">{report.qty500}</dd>
          </div>
        </dl>
      </Card>

      <Card className="p-4">
        <p className="text-sm font-medium text-gray-700">手寫簽名</p>
        <dl className="mt-3 space-y-2 text-sm">
          {report.signerName && (
            <div>
              <dt className="text-gray-400">簽名人</dt>
              <dd className="font-medium">{report.signerName}</dd>
            </div>
          )}
          <div>
            <dt className="text-gray-400">送出時間</dt>
            <dd>{formatDateTime(report.createdAt)}</dd>
          </div>
        </dl>
        {report.signatureData && (
          <div className="mt-4 rounded-lg border bg-white p-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={report.signatureData} alt="簽名" className="mx-auto max-h-48" />
          </div>
        )}
      </Card>
    </div>
  );
}
