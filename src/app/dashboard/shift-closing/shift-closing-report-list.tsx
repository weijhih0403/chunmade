import Link from "next/link";
import { formatDate, formatDateTime } from "@/lib/dates";
import type { ShiftClosingRow } from "@/modules/shift-closing/service";
import { Card } from "@/components/ui/card";
import { Table, THead, TH, TR, TD, EmptyState } from "@/components/ui/table";

function QtyGrid({ report }: { report: ShiftClosingRow }) {
  return (
    <dl className="mt-3 grid grid-cols-4 gap-2 text-center text-sm">
      {(
        [
          ["520碗", report.qty520],
          ["850碗", report.qty850],
          ["700杯", report.qty700],
          ["500杯", report.qty500],
        ] as const
      ).map(([label, qty]) => (
        <div key={label} className="min-w-0 rounded-lg bg-gray-50 px-1 py-2">
          <dt className="truncate text-xs text-gray-400">{label}</dt>
          <dd className="mt-0.5 text-base font-semibold text-gray-900">{qty}</dd>
        </div>
      ))}
    </dl>
  );
}

function MobileCard({ report }: { report: ShiftClosingRow }) {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <Link
            href={`/dashboard/shift-closing/${report.id}`}
            className="truncate font-mono text-sm font-medium text-amber-700 hover:underline"
          >
            {report.reportNo}
          </Link>
          <p className="mt-0.5 truncate text-sm text-gray-700">{report.store.name}</p>
        </div>
        <div className="shrink-0 text-right text-xs text-gray-500">
          <p className="whitespace-nowrap">{formatDate(report.closingDate)}</p>
          <p className="mt-0.5 whitespace-nowrap">{formatDateTime(report.createdAt)}</p>
        </div>
      </div>
      <QtyGrid report={report} />
      <Link
        href={`/dashboard/shift-closing/${report.id}`}
        className="mt-3 inline-block text-sm font-medium text-amber-700 hover:underline"
      >
        查看詳情 →
      </Link>
    </Card>
  );
}

export function ShiftClosingReportList({ reports }: { reports: ShiftClosingRow[] }) {
  if (reports.length === 0) {
    return <EmptyState message="尚無班結紀錄。" />;
  }

  return (
    <>
      <div className="space-y-3 md:hidden">
        {reports.map((r) => (
          <MobileCard key={r.id} report={r} />
        ))}
      </div>

      <div className="hidden md:block">
        <Table className="min-w-[48rem] md:table-auto">
          <THead>
            <tr>
              <TH>單號</TH>
              <TH>門市</TH>
              <TH>日期</TH>
              <TH className="text-right">520碗</TH>
              <TH className="text-right">850碗</TH>
              <TH className="text-right">700杯</TH>
              <TH className="text-right">500杯</TH>
              <TH>時間</TH>
            </tr>
          </THead>
          <tbody>
            {reports.map((r) => (
              <TR key={r.id}>
                <TD className="max-w-[10rem] truncate font-mono text-xs" title={r.reportNo}>
                  <Link
                    href={`/dashboard/shift-closing/${r.id}`}
                    className="text-amber-700 hover:underline"
                  >
                    {r.reportNo}
                  </Link>
                </TD>
                <TD className="max-w-[8rem] truncate" title={r.store.name}>
                  {r.store.name}
                </TD>
                <TD className="whitespace-nowrap text-xs">{formatDate(r.closingDate)}</TD>
                <TD className="text-right">{r.qty520}</TD>
                <TD className="text-right">{r.qty850}</TD>
                <TD className="text-right">{r.qty700}</TD>
                <TD className="text-right">{r.qty500}</TD>
                <TD className="whitespace-nowrap text-xs text-gray-500">
                  {formatDateTime(r.createdAt)}
                </TD>
              </TR>
            ))}
          </tbody>
        </Table>
      </div>
    </>
  );
}
