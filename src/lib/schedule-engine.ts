import type { PreferredShift, ShiftKind } from "@prisma/client";

export type EmployeeLite = {
  id: string;
  name: string;
  sortOrder: number;
  preferredShift: PreferredShift;
};

export type ShiftBlock = {
  employeeId: string;
  date: string;
  shift: ShiftKind;
};

/** 每日早班、晚班各需要的人力數 */
export const SLOTS_PER_SHIFT = 2;

export type DayAssignment = {
  date: string;
  /** 早班（10:00–17:00）人員，至多 {@link SLOTS_PER_SHIFT} 人 */
  earlyStaff: EmployeeLite[];
  /** 晚班（17:00–23:00）人員，至多 {@link SLOTS_PER_SHIFT} 人 */
  lateStaff: EmployeeLite[];
  warnings: string[];
};

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

export function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

export function dateKey(year: number, month: number, day: number): string {
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

export function weekdayZh(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const w = new Date(y, m - 1, d).getDay();
  return ["日", "一", "二", "三", "四", "五", "六"][w] ?? "";
}

export function formatShiftNames(staff: EmployeeLite[]): string {
  if (staff.length === 0) return "—";
  return staff.map((e) => e.name).join("、");
}

function toEmployeesLite(
  employees: {
    id: string;
    name: string;
    sortOrder: number;
    preferredShift: PreferredShift;
  }[],
): EmployeeLite[] {
  return employees.map((e) => ({
    id: e.id,
    name: e.name,
    sortOrder: e.sortOrder,
    preferredShift: e.preferredShift,
  }));
}

/**
 * 依「不可用時段」自動排班：
 * - 每日早班 {@link SLOTS_PER_SHIFT} 人、晚班 {@link SLOTS_PER_SHIFT} 人
 * - 同人同日不可又早班又晚班（不排全天）
 * - 班次內優先均衡總班數；總班數相同時優先排該員「預設班次」
 * - 晚班額外做月份分散：盡量拉開同一人晚班間隔（早班不套用）
 */
export function buildSchedule(
  year: number,
  month: number,
  employees: {
    id: string;
    name: string;
    sortOrder: number;
    preferredShift: PreferredShift;
  }[],
  blocks: ShiftBlock[],
): { assignments: DayAssignment[]; summaryWarnings: string[] } {
  const lite = toEmployeesLite(employees);

  const blocked = new Set<string>();
  for (const b of blocks) {
    blocked.add(`${b.employeeId}|${b.date}|${b.shift}`);
  }

  const isBlocked = (employeeId: string, date: string, shift: ShiftKind) =>
    blocked.has(`${employeeId}|${date}|${shift}`);

  const sorted = [...lite].sort((a, b) =>
    a.sortOrder !== b.sortOrder
      ? a.sortOrder - b.sortOrder
      : a.id.localeCompare(b.id),
  );

  const workload: Record<string, number> = {};
  for (const e of sorted) workload[e.id] = 0;
  const lastLateDay: Record<string, number> = {};
  for (const e of sorted) lastLateDay[e.id] = -9999;

  const assignments: DayAssignment[] = [];
  const summaryWarnings: string[] = [];

  const dim = daysInMonth(year, month);

  /** 較小代表較優先被選中 */
  function comparePick(
    a: EmployeeLite,
    b: EmployeeLite,
    forShift: ShiftKind,
    day: number,
  ): number {
    const w = workload[a.id] - workload[b.id];
    if (w !== 0) return w;
    if (forShift === "LATE") {
      const aGap = day - lastLateDay[a.id];
      const bGap = day - lastLateDay[b.id];
      if (aGap !== bGap) return bGap - aGap;
    }
    const prefScore = (e: EmployeeLite) =>
      String(e.preferredShift) === String(forShift) ? 0 : 1;
    const p = prefScore(a) - prefScore(b);
    if (p !== 0) return p;
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
    return a.id.localeCompare(b.id);
  }

  const pickMinWorkload = (
    pool: EmployeeLite[],
    forShift: ShiftKind,
    day: number,
  ): EmployeeLite | null => {
    if (pool.length === 0) return null;
    return pool.reduce((best, cur) =>
      comparePick(cur, best, forShift, day) < 0 ? cur : best,
    );
  };

  const pickDistinct = (
    pool: EmployeeLite[],
    take: number,
    forShift: ShiftKind,
    day: number,
  ): EmployeeLite[] => {
    const picks: EmployeeLite[] = [];
    let remaining = [...pool];
    for (let i = 0; i < take; i++) {
      const pick = pickMinWorkload(remaining, forShift, day);
      if (!pick) break;
      picks.push(pick);
      workload[pick.id]++;
      remaining = remaining.filter((e) => e.id !== pick.id);
    }
    return picks;
  };

  for (let day = 1; day <= dim; day++) {
    const dk = dateKey(year, month, day);
    const warnings: string[] = [];

    const earlyAvail = sorted.filter((e) => !isBlocked(e.id, dk, "EARLY"));
    const lateAvail = sorted.filter((e) => !isBlocked(e.id, dk, "LATE"));

    const earlyPicks = pickDistinct(earlyAvail, SLOTS_PER_SHIFT, "EARLY", day);
    if (earlyPicks.length < SLOTS_PER_SHIFT) {
      const shortBy = SLOTS_PER_SHIFT - earlyPicks.length;
      warnings.push(`早班缺 ${shortBy} 人（需 ${SLOTS_PER_SHIFT} 人）`);
      summaryWarnings.push(`${dk} 早班缺 ${shortBy} 人`);
    }

    const earlyIds = new Set(earlyPicks.map((e) => e.id));
    const latePool = lateAvail.filter((e) => !earlyIds.has(e.id));

    const latePicks = pickDistinct(latePool, SLOTS_PER_SHIFT, "LATE", day);
    for (const p of latePicks) {
      lastLateDay[p.id] = day;
    }
    if (latePicks.length < SLOTS_PER_SHIFT) {
      const shortBy = SLOTS_PER_SHIFT - latePicks.length;
      warnings.push(`晚班缺 ${shortBy} 人（需 ${SLOTS_PER_SHIFT} 人）`);
      summaryWarnings.push(`${dk} 晚班缺 ${shortBy} 人`);
    }

    assignments.push({
      date: dk,
      earlyStaff: earlyPicks,
      lateStaff: latePicks,
      warnings,
    });
  }

  return { assignments, summaryWarnings };
}
