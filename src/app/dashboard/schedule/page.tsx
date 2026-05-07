import { prisma } from "@/lib/prisma";
import { buildSchedule } from "@/lib/schedule-engine";
import { SchedulePlanner } from "./schedule-planner";

export default async function SchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string }>;
}) {
  const sp = await searchParams;
  const now = new Date();
  const year = Number(sp.year) || now.getFullYear();
  const month = Number(sp.month) || now.getMonth() + 1;

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

  return (
    <SchedulePlanner
      year={year}
      month={month}
      employees={employees}
      blocks={blocks}
      assignments={assignments}
      summaryWarnings={summaryWarnings}
    />
  );
}
