import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/permissions";
import { salesSummary, defaultRange } from "@/modules/reports/service";
import { handleApiError } from "@/lib/api/response";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const actor = await requirePermission("report.export");
    const def = defaultRange();
    const fromParam = req.nextUrl.searchParams.get("from");
    const toParam = req.nextUrl.searchParams.get("to");
    const range = {
      from: fromParam ? new Date(fromParam) : def.from,
      to: toParam ? new Date(`${toParam}T23:59:59`) : def.to,
    };

    const summary = await salesSummary(actor, range);

    const rows = [["日期", "訂單數", "營收", "毛利"]];
    for (const d of summary.daily) {
      rows.push([d.date, String(d.orders), d.revenue.toFixed(2), d.profit.toFixed(2)]);
    }
    rows.push([
      "合計",
      String(summary.orderCount),
      summary.totalRevenue.toFixed(2),
      summary.totalProfit.toFixed(2),
    ]);

    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\r\n");
    const bom = "\uFEFF"; // 讓 Excel 正確辨識 UTF-8

    return new NextResponse(bom + csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="sales-report.csv"`,
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}
