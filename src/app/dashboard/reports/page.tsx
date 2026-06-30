import { requirePermission } from "@/lib/permissions";
import { salesSummary, topItems, paymentBreakdown, defaultRange } from "@/modules/reports/service";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, THead, TH, TR, TD, EmptyState } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { formatTWD } from "@/lib/money";
import { formatDate } from "@/lib/dates";

export const dynamic = "force-dynamic";

function parseRange(searchParams: { from?: string; to?: string }) {
  const def = defaultRange();
  const from = searchParams.from ? new Date(searchParams.from) : def.from;
  const to = searchParams.to ? new Date(`${searchParams.to}T23:59:59`) : def.to;
  return { from, to };
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const actor = await requirePermission("report.read");
  const sp = await searchParams;
  const range = parseRange(sp);
  const [summary, items, payments] = await Promise.all([
    salesSummary(actor, range),
    topItems(actor, range),
    paymentBreakdown(actor, range),
  ]);
  const canExport = actor.permissions.has("report.export");
  const fromStr = formatDate(range.from);
  const toStr = formatDate(range.to);

  return (
    <div className="space-y-6">
      <PageHeader
        title="營運報表"
        description={`期間：${fromStr} ~ ${toStr}`}
        action={
          canExport ? (
            <a href={`/api/reports/sales?from=${fromStr}&to=${toStr}`}>
              <Button variant="outline">匯出 CSV</Button>
            </a>
          ) : null
        }
      />

      <form className="flex flex-wrap items-end gap-2" method="get">
        <div>
          <label className="mb-1 block text-xs text-gray-500">起</label>
          <input
            type="date"
            name="from"
            defaultValue={fromStr}
            className="h-9 rounded border border-gray-300 px-2"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-gray-500">迄</label>
          <input
            type="date"
            name="to"
            defaultValue={toStr}
            className="h-9 rounded border border-gray-300 px-2"
          />
        </div>
        <Button type="submit" variant="outline">
          查詢
        </Button>
      </form>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="訂單數" value={summary.orderCount.toLocaleString("zh-TW")} />
        <Stat label="營業額" value={formatTWD(summary.totalRevenue)} />
        <Stat label="毛利" value={formatTWD(summary.totalProfit)} />
        <Stat label="客單價" value={formatTWD(summary.avgOrderValue)} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>每日營收</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <THead>
                <tr>
                  <TH>日期</TH>
                  <TH className="text-right">訂單</TH>
                  <TH className="text-right">營收</TH>
                  <TH className="text-right">毛利</TH>
                </tr>
              </THead>
              <tbody>
                {summary.daily.length === 0 ? (
                  <tr>
                    <td colSpan={4}>
                      <EmptyState message="期間內無銷售。" />
                    </td>
                  </tr>
                ) : (
                  summary.daily.map((d) => (
                    <TR key={d.date}>
                      <TD>{d.date}</TD>
                      <TD className="text-right">{d.orders}</TD>
                      <TD className="text-right">{formatTWD(d.revenue)}</TD>
                      <TD className="text-right">{formatTWD(d.profit)}</TD>
                    </TR>
                  ))
                )}
              </tbody>
            </Table>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>熱銷商品 Top 10</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <THead>
                  <tr>
                    <TH>商品</TH>
                    <TH className="text-right">數量</TH>
                    <TH className="text-right">營收</TH>
                  </tr>
                </THead>
                <tbody>
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan={3}>
                        <EmptyState message="無資料。" />
                      </td>
                    </tr>
                  ) : (
                    items.map((it) => (
                      <TR key={it.name}>
                        <TD className="font-medium text-gray-900">{it.name}</TD>
                        <TD className="text-right">{it.quantity}</TD>
                        <TD className="text-right">{formatTWD(it.revenue)}</TD>
                      </TR>
                    ))
                  )}
                </tbody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>付款方式占比</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <THead>
                  <tr>
                    <TH>付款方式</TH>
                    <TH className="text-right">筆數</TH>
                    <TH className="text-right">金額</TH>
                  </tr>
                </THead>
                <tbody>
                  {payments.length === 0 ? (
                    <tr>
                      <td colSpan={3}>
                        <EmptyState message="無資料。" />
                      </td>
                    </tr>
                  ) : (
                    payments.map((p) => (
                      <TR key={p.method}>
                        <TD>{p.method}</TD>
                        <TD className="text-right">{p.count}</TD>
                        <TD className="text-right">{formatTWD(p.amount)}</TD>
                      </TR>
                    ))
                  )}
                </tbody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent>
        <p className="text-sm text-gray-500">{label}</p>
        <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
      </CardContent>
    </Card>
  );
}
