import ExcelJS from "exceljs";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  buildSchedule,
  formatShiftNames,
  weekdayZh,
} from "@/lib/schedule-engine";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "未登入" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const year = Number(searchParams.get("year"));
  const month = Number(searchParams.get("month"));

  if (
    !Number.isFinite(year) ||
    !Number.isFinite(month) ||
    month < 1 ||
    month > 12
  ) {
    return NextResponse.json({ error: "年份或月份無效" }, { status: 400 });
  }

  const employees = await prisma.employee.findMany({
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
  });

  const dim = new Date(year, month, 0).getDate();
  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  const start = `${year}-${pad(month)}-01`;
  const end = `${year}-${pad(month)}-${pad(dim)}`;

  const blocks = await prisma.shiftUnavailability.findMany({
    where: {
      date: { gte: start, lte: end },
    },
  });

  const { assignments, summaryWarnings } = buildSchedule(
    year,
    month,
    employees,
    blocks.map((b) => ({
      employeeId: b.employeeId,
      date: b.date,
      shift: b.shift,
    })),
  );

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "淳手作班表";

  const sheet = workbook.addWorksheet(`${year}年${month}月`, {
    views: [{ state: "frozen", ySplit: 3 }],
  });

  sheet.getCell("A1").value = "班表說明";
  sheet.getCell("B1").value =
    "每日早班 2 人（10:00–17:00）、晚班 2 人（17:00–23:00）；同人同日不重複早＋晚；勾選網頁「不可排班」後自動排出。";

  sheet.mergeCells("B1:E1");

  sheet.addRow([]);
  sheet.addRow([
    "日期",
    "星期",
    "早班（2人，10:00–17:00）",
    "晚班（2人，17:00–23:00）",
    "備註",
  ]);

  const headerRow = sheet.lastRow;
  headerRow?.eachCell((cell) => {
    cell.font = { bold: true };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFF5F0EB" },
    };
  });

  for (const a of assignments) {
    const note = a.warnings.length ? a.warnings.join("；") : "";
    sheet.addRow([
      a.date,
      `週${weekdayZh(a.date)}`,
      formatShiftNames(a.earlyStaff),
      formatShiftNames(a.lateStaff),
      note,
    ]);
  }

  sheet.columns = [
    { width: 12 },
    { width: 8 },
    { width: 22 },
    { width: 22 },
    { width: 36 },
  ];

  const meta = workbook.addWorksheet("排班摘要");
  meta.addRow(["自動排班摘要"]);
  meta.addRow([]);
  if (summaryWarnings.length === 0) {
    meta.addRow(["本月每日早／晚班皆已各排滿 2 人（或無員工資料）。"]);
  } else {
    for (const w of summaryWarnings) {
      meta.addRow([w]);
    }
  }

  meta.addRow([]);
  meta.addRow(["員工清單"]);
  meta.addRow(["姓名", "預設班次", "身分"]);
  for (const e of employees) {
    meta.addRow([
      e.name,
      e.preferredShift === "EARLY" ? "早班" : "晚班",
      e.employmentType === "FULL_TIME" ? "正職" : "打工",
    ]);
  }

  const buffer = await workbook.xlsx.writeBuffer();

  const filename = `班表_${year}年${month}月.xlsx`;

  return new NextResponse(Buffer.from(buffer), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
    },
  });
}
