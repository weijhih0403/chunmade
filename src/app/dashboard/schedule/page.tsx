import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { buildSchedule } from "@/lib/schedule-engine";
import { SchedulePlanner } from "./schedule-planner";

type Store = "SHUIDUI" | "ASAKUSA" | "TAIPEI_BAY";
const STORE_LIST: Store[] = ["SHUIDUI", "ASAKUSA", "TAIPEI_BAY"];

function parseStore(raw: string | undefined): Store {
  if (raw === "ASAKUSA") return "ASAKUSA";
  if (raw === "TAIPEI_BAY") return "TAIPEI_BAY";
  return "SHUIDUI";
}

export default async function SchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string; store?: string }>;
}) {
  const sp = await searchParams;
  const now = new Date();
  const defaultDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const year = Number(sp.year) || defaultDate.getFullYear();
  const month = Number(sp.month) || defaultDate.getMonth() + 1;
  const store = parseStore(sp.store);
  const session = await auth();
  const canEdit = Boolean(session?.user?.isAdmin);

  const employees = await prisma.employee.findMany({
    where: { store },
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
  });

  const dim = new Date(year, month, 0).getDate();
  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  const start = `${year}-${pad(month)}-01`;
  const end = `${year}-${pad(month)}-${pad(dim)}`;

  const blocks = await prisma.shiftUnavailability.findMany({
    where: {
      date: { gte: start, lte: end },
      employee: { store },
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
      store={store}
      stores={STORE_LIST}
      canEdit={canEdit}
      employees={employees}
      blocks={blocks}
      assignments={assignments}
      summaryWarnings={summaryWarnings}
    />
  );
}
