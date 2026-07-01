import Link from "next/link";
import { requirePermission } from "@/lib/permissions";
import { listWarehouses, getTrackedItems } from "@/modules/inventory/service";
import {
  buildStoreSettlementSummary,
  formatMonthInput,
  listMonthTransfers,
  monthHref,
} from "@/modules/inventory/transfer-service";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, THead, TH, TR, TD, EmptyState, Badge } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { formatDate, formatDateTime } from "@/lib/dates";
import { formatTWD } from "@/lib/money";
import { settlementStatusColor, settlementStatusLabel } from "@/modules/inventory/transfer-labels";
import { TransferForm } from "./transfer-form";
import { SettlementEditForm } from "./settlement-edit-form";

export const dynamic = "force-dynamic";

export default async function TransfersPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month } = await searchParams;
  const actor = await requirePermission("inventory.transfer");
  const { monthKey, monthLabel, rows, stores } = await listMonthTransfers(actor, month);
  const summary = buildStoreSettlementSummary(rows, stores);

  const [warehouses, items] = await Promise.all([
    listWarehouses(actor),
    getTrackedItems(actor),
  ]);

  const exportUrl = `/api/transfers/export?month=${formatMonthInput(monthKey)}`;
  const pendingCount = rows.filter((r) => r.settlementStatus === "PENDING").length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="倉庫調撥"
        description="於不同倉庫間移轉庫存，並追蹤跨門市貨款結算"
        action={
          <div className="flex flex-wrap items-center gap-2">
            <form method="get" className="flex items-center gap-2">
              <input
                type="month"
                name="month"
                defaultValue={formatMonthInput(monthKey)}
                className="h-10 rounded-lg border border-gray-300 px-3 text-sm"
              />
              <Button type="submit" variant="outline" size="sm">
                篩選
              </Button>
            </form>
            <a href={exportUrl}>
              <Button size="sm">匯出 Excel</Button>
            </a>
          </div>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>新增調撥</CardTitle>
        </CardHeader>
        <CardContent>
          <TransferForm
            warehouses={warehouses.map((w) => ({ id: w.id, name: w.name }))}
            items={items.map((i) => ({ id: i.id, name: `${i.name}（${i.sku}）` }))}
          />
        </CardContent>
      </Card>

      {summary.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{monthLabel} 門市貨款彙總</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <THead>
                <tr>
                  <TH>門市</TH>
                  <TH className="text-right">應收</TH>
                  <TH className="text-right">應付</TH>
                  <TH className="text-right">淨額</TH>
                  <TH className="text-right">待收</TH>
                  <TH className="text-right">待付</TH>
                </tr>
              </THead>
              <tbody>
                {summary.map((s) => {
                  const net = s.receivable.sub(s.payable);
                  return (
                    <TR key={s.storeId}>
                      <TD className="font-medium">{s.storeName}</TD>
                      <TD className="text-right">{formatTWD(s.receivable)}</TD>
                      <TD className="text-right">{formatTWD(s.payable)}</TD>
                      <TD
                        className={`text-right font-semibold ${
                          net.greaterThan(0)
                            ? "text-green-700"
                            : net.lessThan(0)
                              ? "text-red-600"
                              : ""
                        }`}
                      >
                        {formatTWD(net)}
                      </TD>
                      <TD className="text-right text-amber-700">
                        {formatTWD(s.pendingReceivable)}
                      </TD>
                      <TD className="text-right text-amber-700">{formatTWD(s.pendingPayable)}</TD>
                    </TR>
                  );
                })}
              </tbody>
            </Table>
            <p className="border-t px-4 py-2 text-xs text-gray-500">
              淨額為正：可向其他門市收取；淨額為負：應補付其他門市。匯出 Excel 含明細與待處理清單。
            </p>
          </CardContent>
        </Card>
      )}

      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-gray-900">
          {monthLabel} 調撥紀錄
          {pendingCount > 0 && (
            <span className="ml-2 text-sm font-normal text-amber-700">
              （{pendingCount} 筆待處理貨款）
            </span>
          )}
        </h2>
        <Link href={monthHref(monthKey)} className="text-sm text-gray-500 hover:underline">
          重新整理
        </Link>
      </div>

      <div className="hidden md:block">
        <Table>
          <THead>
            <tr>
              <TH>單號</TH>
              <TH>來源 → 目的</TH>
              <TH>品項</TH>
              <TH className="text-right">貨款金額</TH>
              <TH>向誰收款</TH>
              <TH>付給誰</TH>
              <TH>貨款狀態</TH>
              <TH>時間</TH>
              <TH>登記</TH>
            </tr>
          </THead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={9}>
                  <EmptyState message={`${monthLabel}尚無調撥紀錄。`} />
                </td>
              </tr>
            ) : (
              rows.map((t) => (
                <TR key={t.id}>
                  <TD className="font-mono text-xs">{t.transferNo}</TD>
                  <TD>
                    <span className="text-gray-600">{t.fromWarehouse}</span>
                    <span className="text-gray-400"> → </span>
                    <span className="text-gray-900">{t.toWarehouse}</span>
                  </TD>
                  <TD>{t.itemCount} 項</TD>
                  <TD className="text-right font-medium">
                    {t.settlementAmount.greaterThan(0) ? formatTWD(t.settlementAmount) : "—"}
                  </TD>
                  <TD>{t.collectFromStore ?? "—"}</TD>
                  <TD>{t.payToStore ?? "—"}</TD>
                  <TD>
                    <Badge color={settlementStatusColor(t.settlementStatus)}>
                      {settlementStatusLabel(t.settlementStatus)}
                    </Badge>
                  </TD>
                  <TD className="whitespace-nowrap text-xs text-gray-500">
                    {formatDateTime(t.completedAt)}
                  </TD>
                  <TD>
                    <SettlementEditForm
                      transferId={t.id}
                      stores={stores}
                      defaults={{
                        settlementStatus: t.settlementStatus,
                        collectFromStoreId: t.collectFromStoreId,
                        payToStoreId: t.payToStoreId,
                        settlementNote: t.settlementNote,
                      }}
                    />
                  </TD>
                </TR>
              ))
            )}
          </tbody>
        </Table>
      </div>

      <div className="space-y-3 md:hidden">
        {rows.length === 0 ? (
          <EmptyState message={`${monthLabel}尚無調撥紀錄。`} />
        ) : (
          rows.map((t) => (
            <Card key={t.id} className="p-4">
              <div className="flex items-start justify-between gap-2">
                <p className="font-mono text-xs text-gray-500">{t.transferNo}</p>
                <Badge color={settlementStatusColor(t.settlementStatus)}>
                  {settlementStatusLabel(t.settlementStatus)}
                </Badge>
              </div>
              <p className="mt-1 text-sm">
                {t.fromWarehouse} → {t.toWarehouse}
              </p>
              <p className="mt-1 text-xs text-gray-500">{formatDate(t.completedAt)}</p>
              {t.settlementAmount.greaterThan(0) && (
                <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <dt className="text-xs text-gray-400">貨款</dt>
                    <dd className="font-medium">{formatTWD(t.settlementAmount)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-gray-400">向誰收款</dt>
                    <dd>{t.collectFromStore ?? "—"}</dd>
                  </div>
                  <div className="col-span-2">
                    <dt className="text-xs text-gray-400">付給誰</dt>
                    <dd>{t.payToStore ?? "—"}</dd>
                  </div>
                </dl>
              )}
              <div className="mt-3 border-t pt-3">
                <SettlementEditForm
                  transferId={t.id}
                  stores={stores}
                  defaults={{
                    settlementStatus: t.settlementStatus,
                    collectFromStoreId: t.collectFromStoreId,
                    payToStoreId: t.payToStoreId,
                    settlementNote: t.settlementNote,
                  }}
                />
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
