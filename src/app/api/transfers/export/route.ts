import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/permissions";
import { handleApiError } from "@/lib/api/response";
import { buildTransferExcel } from "@/modules/inventory/transfer-export";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const actor = await requirePermission("inventory.transfer");
    const month = req.nextUrl.searchParams.get("month") ?? undefined;
    const { buffer, monthLabel, monthKey } = await buildTransferExcel(actor, month);
    const filename = `調撥月報-${monthKey ?? monthLabel}.xlsx`;

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}
