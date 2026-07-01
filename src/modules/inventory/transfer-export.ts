import "server-only";
import ExcelJS from "exceljs";
import { settlementStatusLabel, type TransferSettlementStatus } from "./transfer-labels";
import { formatDate, formatDateTime } from "@/lib/dates";
import {
  buildStoreSettlementSummary,
  listMonthTransfers,
  type StoreSettlementSummary,
} from "./transfer-service";
import type { Actor } from "@/lib/permissions";

function statusLabel(s: TransferSettlementStatus) {
  return settlementStatusLabel(s);
}

function headerStyle(row: ExcelJS.Row) {
  row.font = { bold: true };
  row.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF3F4F6" } };
}

export async function buildTransferExcel(actor: Actor, month?: string) {
  const { monthKey, monthLabel, rows, stores } = await listMonthTransfers(actor, month);
  const summary = buildStoreSettlementSummary(rows, stores);

  const wb = new ExcelJS.Workbook();
  wb.creator = "淳手作 ERP";

  const detail = wb.addWorksheet("調撥明細");
  detail.columns = [
    { header: "日期", key: "date", width: 12 },
    { header: "單號", key: "no", width: 18 },
    { header: "來源倉庫", key: "fromWh", width: 16 },
    { header: "來源門市", key: "fromStore", width: 14 },
    { header: "目的倉庫", key: "toWh", width: 16 },
    { header: "目的門市", key: "toStore", width: 14 },
    { header: "SKU", key: "sku", width: 12 },
    { header: "品名", key: "name", width: 20 },
    { header: "數量", key: "qty", width: 10 },
    { header: "單位", key: "unit", width: 8 },
    { header: "單價", key: "cost", width: 10 },
    { header: "金額", key: "amount", width: 12 },
    { header: "向誰收款", key: "collect", width: 14 },
    { header: "付給誰", key: "pay", width: 14 },
    { header: "貨款狀態", key: "status", width: 10 },
    { header: "備註", key: "note", width: 20 },
  ];
  headerStyle(detail.getRow(1));

  for (const t of rows) {
    if (t.items.length === 0) {
      detail.addRow({
        date: formatDate(t.completedAt),
        no: t.transferNo,
        fromWh: t.fromWarehouse,
        fromStore: t.fromStore,
        toWh: t.toWarehouse,
        toStore: t.toStore,
        collect: t.collectFromStore ?? "",
        pay: t.payToStore ?? "",
        status: statusLabel(t.settlementStatus),
        note: t.settlementNote ?? "",
      });
      continue;
    }
    for (const line of t.items) {
      detail.addRow({
        date: formatDate(t.completedAt),
        no: t.transferNo,
        fromWh: t.fromWarehouse,
        fromStore: t.fromStore,
        toWh: t.toWarehouse,
        toStore: t.toStore,
        sku: line.sku,
        name: line.name,
        qty: Number(line.quantity),
        unit: line.unit,
        cost: Number(line.unitCost),
        amount: Number(line.lineTotal),
        collect: t.collectFromStore ?? "",
        pay: t.payToStore ?? "",
        status: statusLabel(t.settlementStatus),
        note: t.settlementNote ?? "",
      });
    }
  }

  const settle = wb.addWorksheet("門市貨款彙總");
  settle.columns = [
    { header: "門市", key: "store", width: 18 },
    { header: "本月應收貨款", key: "recv", width: 14 },
    { header: "本月應付貨款", key: "pay", width: 14 },
    { header: "淨額（應收-應付）", key: "net", width: 16 },
    { header: "待收", key: "pendingRecv", width: 12 },
    { header: "待付", key: "pendingPay", width: 12 },
    { header: "說明", key: "hint", width: 28 },
  ];
  headerStyle(settle.getRow(1));

  for (const s of summary) {
    const net = s.receivable.sub(s.payable);
    let hint = "";
    if (net.greaterThan(0)) hint = `可向其他門市收取淨額 ${net.toFixed(0)} 元`;
    else if (net.lessThan(0)) hint = `應補付其他門市淨額 ${net.abs().toFixed(0)} 元`;
    else hint = "本月應收應付相抵";

    settle.addRow({
      store: s.storeName,
      recv: Number(s.receivable),
      pay: Number(s.payable),
      net: Number(net),
      pendingRecv: Number(s.pendingReceivable),
      pendingPay: Number(s.pendingPayable),
      hint,
    });
  }

  const ledger = wb.addWorksheet("待處理貨款");
  ledger.columns = [
    { header: "日期", key: "date", width: 12 },
    { header: "單號", key: "no", width: 18 },
    { header: "調撥", key: "route", width: 28 },
    { header: "金額", key: "amount", width: 12 },
    { header: "向誰收款", key: "collect", width: 14 },
    { header: "付給誰", key: "pay", width: 14 },
    { header: "狀態", key: "status", width: 10 },
    { header: "備註", key: "note", width: 20 },
  ];
  headerStyle(ledger.getRow(1));

  for (const t of rows.filter((r) => r.settlementStatus === "PENDING")) {
    ledger.addRow({
      date: formatDate(t.completedAt),
      no: t.transferNo,
      route: `${t.fromWarehouse} → ${t.toWarehouse}`,
      amount: Number(t.settlementAmount),
      collect: t.collectFromStore ?? "",
      pay: t.payToStore ?? "",
      status: statusLabel(t.settlementStatus),
      note: t.settlementNote ?? "",
    });
  }

  const meta = wb.addWorksheet("說明");
  meta.addRow([`調撥月報：${monthLabel}`]);
  meta.addRow([`匯出時間：${formatDateTime(new Date())}`]);
  meta.addRow([]);
  meta.addRow(["貨款規則："]);
  meta.addRow(["• 跨門市調撥時，目的門市應付來源門市貨款（成本價）"]);
  meta.addRow(["• 「向誰收款」= 應向該門市收取貨款"]);
  meta.addRow(["• 「付給誰」= 應補付該門市貨款"]);
  meta.addRow(["• 狀態：待處理 / 已收款 / 已付款 / 免結算"]);

  const buffer = await wb.xlsx.writeBuffer();
  return { buffer, monthLabel, monthKey };
}

export type { StoreSettlementSummary };
