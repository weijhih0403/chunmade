import type { Employee, EmployeePreference, LeaveRequest, Schedule, Shift } from "@prisma/client";
import {
  buildAutoScheduleReport,
  formatReportText,
  type AutoScheduleReport,
  type ScheduleConflict,
} from "./auto-schedule-report";
import {
  classifyEmployee,
  dateOnly,
  defaultMaxShifts,
  defaultMinShifts,
  sameDay,
  tenureDays,
  type EmployeeTier,
  type ProposedSchedule,
} from "./auto-schedule-utils";

export type { ProposedSchedule } from "./auto-schedule-utils";

export type AutoSchedulePlanInput = {
  employees: Employee[];
  shifts: Shift[];
  preferences: EmployeePreference[];
  existing: Schedule[];
  leaves: LeaveRequest[];
  storeId: string;
  startDate: Date;
  days: number;
  minPerShift?: number;
};

export type AutoScheduleResult = {
  plan: ProposedSchedule[];
  report: AutoScheduleReport;
  reportText: string;
};

type Tracker = {
  total: number;
  saturday: number;
  sunday: number;
  byShift: Map<string, number>;
  dates: Date[];
  seniorPartners: Map<string, number>;
  withSenior: number;
  newbieShifts: number;
};

export function calcShiftTimes(workDate: Date, shift: Shift): { startAt: Date; endAt: Date } {
  const wd = workDate.toISOString().slice(0, 10);
  const startAt = new Date(`${wd}T${shift.startTime}:00`);
  let endAt = new Date(`${wd}T${shift.endTime}:00`);
  if (endAt <= startAt) endAt = new Date(endAt.getTime() + 86400000);
  return { startAt, endAt };
}

export function isOnApprovedLeave(employeeId: string, day: Date, leaves: LeaveRequest[]): boolean {
  const dayStart = dateOnly(day);
  const dayEnd = new Date(dayStart.getTime() + 86400000 - 1);
  return leaves.some(
    (l) =>
      l.employeeId === employeeId &&
      l.status === "APPROVED" &&
      l.startAt <= dayEnd &&
      l.endAt >= dayStart,
  );
}

export function scoreEmployeeForSlot(
  employee: Employee,
  shift: Shift,
  weekday: number,
  preferences: EmployeePreference[],
): number | null {
  const dayPrefs = preferences.filter((p) => p.employeeId === employee.id && p.weekday === weekday);
  if (dayPrefs.length === 0) return 0;
  const forShift = dayPrefs.filter((p) => p.shiftId == null || p.shiftId === shift.id);
  if (forShift.length === 0) return null;
  const shiftSpecific = forShift.filter((p) => p.shiftId === shift.id);
  if (shiftSpecific.some((p) => !p.available)) return null;
  const general = forShift.filter((p) => p.shiftId == null);
  if (shiftSpecific.length === 0 && general.length > 0 && general.every((p) => !p.available)) {
    return null;
  }
  const availableRows = forShift.filter((p) => p.available);
  if (availableRows.length === 0) return null;
  let score = Math.max(...availableRows.map((p) => p.preference));
  if (availableRows.some((p) => p.shiftId === shift.id)) score += 5;
  return score;
}

function shiftStartMinutes(shift: Shift): number {
  const parts = shift.startTime.split(":").map(Number);
  const h = parts[0] ?? 0;
  const m = parts[1] ?? 0;
  return h * 60 + m;
}

function shiftEndMinutes(shift: Shift): number {
  const parts = shift.endTime.split(":").map(Number);
  const h = parts[0] ?? 0;
  const m = parts[1] ?? 0;
  let end = h * 60 + m;
  if (end <= shiftStartMinutes(shift)) end += 24 * 60;
  return end;
}

function isEarlyShift(shift: Shift, all: Shift[]): boolean {
  return shiftStartMinutes(shift) === Math.min(...all.map(shiftStartMinutes));
}

function isLateShift(shift: Shift, all: Shift[]): boolean {
  return shiftEndMinutes(shift) === Math.max(...all.map(shiftEndMinutes));
}

function maxConsecutiveIfAdd(dates: Date[], newDay: Date): number {
  const set = new Set(dates.map((d) => dateOnly(d).getTime()));
  set.add(dateOnly(newDay).getTime());
  const sorted = [...set].sort((a, b) => a - b);
  let max = 1;
  let streak = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1]!;
    const current = sorted[i]!;
    streak = current - prev === 86400000 ? streak + 1 : 1;
    max = Math.max(max, streak);
  }
  return max;
}

function hasLateThenEarly(
  employeeId: string,
  day: Date,
  shift: Shift,
  rows: ProposedSchedule[],
  existing: Schedule[],
  shifts: Shift[],
): boolean {
  if (!isEarlyShift(shift, shifts)) return false;
  const yesterday = new Date(dateOnly(day).getTime() - 86400000);
  const prev =
    rows.find((r) => r.employeeId === employeeId && sameDay(r.workDate, yesterday)) ??
    existing.find((r) => r.employeeId === employeeId && sameDay(r.workDate, yesterday));
  if (!prev) return false;
  const prevShift = shifts.find((s) => s.id === prev.shiftId);
  return Boolean(prevShift && isLateShift(prevShift, shifts));
}

function shiftHeadcount(shift: Shift, fallback: number): number {
  return Math.max(1, shift.requiredHeadcount ?? fallback);
}

function initTracker(employeeId: string, existing: Schedule[], plan: ProposedSchedule[]): Tracker {
  const rows = [
    ...existing.filter((s) => s.employeeId === employeeId),
    ...plan.filter((s) => s.employeeId === employeeId),
  ];
  const byShift = new Map<string, number>();
  let saturday = 0;
  let sunday = 0;
  for (const r of rows) {
    byShift.set(r.shiftId, (byShift.get(r.shiftId) ?? 0) + 1);
    const wd = r.workDate.getDay();
    if (wd === 6) saturday++;
    if (wd === 0) sunday++;
  }
  return {
    total: rows.length,
    saturday,
    sunday,
    byShift,
    dates: rows.map((r) => dateOnly(r.workDate)),
    seniorPartners: new Map(),
    withSenior: 0,
    newbieShifts: 0,
  };
}

function hasShiftOnDay(
  employeeId: string,
  day: Date,
  existing: Schedule[],
  plan: ProposedSchedule[],
): boolean {
  return (
    existing.some((s) => s.employeeId === employeeId && sameDay(s.workDate, day)) ||
    plan.some((s) => s.employeeId === employeeId && sameDay(s.workDate, day))
  );
}

function shiftHasMentor(assignedIds: string[], employees: Employee[], tierRef: Date): boolean {
  return assignedIds.some((id) => {
    const emp = employees.find((e) => e.id === id);
    if (!emp) return false;
    const tier = classifyEmployee(emp.hireDate, tierRef);
    return tier === "SENIOR" || tier === "REGULAR";
  });
}

function canAssignHard(input: {
  emp: Employee;
  shift: Shift;
  workDate: Date;
  weekday: number;
  preferences: EmployeePreference[];
  leaves: LeaveRequest[];
  storeId: string;
  existing: Schedule[];
  plan: ProposedSchedule[];
  shifts: Shift[];
  tracker: Tracker;
  daysInMonth: number;
}): string | null {
  const { emp, shift, workDate, weekday, preferences, leaves, storeId, existing, plan, shifts, tracker, daysInMonth } =
    input;
  if (!emp.isActive || emp.deletedAt) return "inactive";
  if (emp.primaryStoreId && emp.primaryStoreId !== storeId) return "store";
  if (isOnApprovedLeave(emp.id, workDate, leaves)) return "leave";
  if (scoreEmployeeForSlot(emp, shift, weekday, preferences) === null) return "preference";
  if (hasShiftOnDay(emp.id, workDate, existing, plan)) return "same-day";
  if (tracker.total >= defaultMaxShifts(emp, daysInMonth)) return "max-shifts";
  if (maxConsecutiveIfAdd(tracker.dates, workDate) > 5) return "consecutive";
  if (hasLateThenEarly(emp.id, workDate, shift, plan, existing, shifts)) return "late-early";
  return null;
}

function scoreCandidate(input: {
  emp: Employee;
  tier: EmployeeTier;
  shift: Shift;
  workDate: Date;
  weekday: number;
  preferences: EmployeePreference[];
  tracker: Tracker;
  assignedIds: string[];
  employees: Employee[];
  tierRef: Date;
  shifts: Shift[];
  daysInMonth: number;
  needMentor: boolean;
}): number {
  const { emp, tier, shift, weekday, preferences, tracker, assignedIds, employees, tierRef, shifts, daysInMonth, needMentor } =
    input;
  const pref = scoreEmployeeForSlot(emp, shift, weekday, preferences) ?? 0;
  let score = pref * 10;
  if (tier === "SENIOR" && needMentor) score += 500;
  if (tier === "REGULAR" && needMentor) score += 300;
  if (tier === "NEW") {
    if (!shiftHasMentor(assignedIds, employees, tierRef)) score -= 10_000;
    else score += 200;
  }
  const min = defaultMinShifts(emp);
  if (tracker.total < min) score += 150 + (min - tracker.total) * 20;
  if ((weekday === 6 || weekday === 0) && tracker.saturday + tracker.sunday === 0) score += 120;
  if (weekday === 6 || weekday === 0) {
    if (tracker.saturday + tracker.sunday > 2) score -= 40;
  }
  score -= tracker.total * 25;
  const early = isEarlyShift(shift, shifts);
  const earlyCount = [...tracker.byShift.entries()].reduce((sum, [id, n]) => {
    const sh = shifts.find((s) => s.id === id);
    return sum + (sh && isEarlyShift(sh, shifts) ? n : 0);
  }, 0);
  const lateCount = tracker.total - earlyCount;
  if (early && earlyCount > lateCount) score -= 15;
  if (!early && lateCount > earlyCount) score -= 15;
  if (tier === "NEW") {
    for (const sid of assignedIds) {
      const partner = employees.find((e) => e.id === sid);
      if (partner && classifyEmployee(partner.hireDate, tierRef) === "SENIOR") {
        score -= (tracker.seniorPartners.get(sid) ?? 0) * 8;
        score += tenureDays(partner.hireDate, tierRef) / 30;
      }
    }
  }
  if (tracker.total >= defaultMaxShifts(emp, daysInMonth) - 1) score -= 200;
  return score;
}

function pickForSlot(
  candidates: Employee[],
  input: Omit<Parameters<typeof canAssignHard>[0], "emp" | "tracker"> & {
    employees: Employee[];
    tierRef: Date;
    assignedIds: string[];
    needMentor: boolean;
    trackers: Map<string, Tracker>;
  },
): Employee | null {
  const scored: Array<{ emp: Employee; score: number }> = [];
  for (const emp of candidates) {
    const tracker = input.trackers.get(emp.id) ?? initTracker(emp.id, input.existing, input.plan);
    if (canAssignHard({ ...input, emp, tracker })) continue;
    const tier = classifyEmployee(emp.hireDate, input.tierRef);
    scored.push({
      emp,
      score: scoreCandidate({
        emp,
        tier,
        shift: input.shift,
        workDate: input.workDate,
        weekday: input.weekday,
        preferences: input.preferences,
        tracker,
        assignedIds: input.assignedIds,
        employees: input.employees,
        tierRef: input.tierRef,
        shifts: input.shifts,
        daysInMonth: input.daysInMonth,
        needMentor: input.needMentor,
      }),
    });
  }
  scored.sort((a, b) => b.score - a.score);
  return scored[0]?.emp ?? null;
}

function recordAssignment(
  trackers: Map<string, Tracker>,
  emp: Employee,
  shift: Shift,
  workDate: Date,
  assignedIds: string[],
  employees: Employee[],
  tierRef: Date,
) {
  const tracker = trackers.get(emp.id)!;
  tracker.total++;
  tracker.dates.push(dateOnly(workDate));
  tracker.byShift.set(shift.id, (tracker.byShift.get(shift.id) ?? 0) + 1);
  const wd = workDate.getDay();
  if (wd === 6) tracker.saturday++;
  if (wd === 0) tracker.sunday++;
  if (classifyEmployee(emp.hireDate, tierRef) === "NEW") {
    tracker.newbieShifts++;
    if (shiftHasMentor(assignedIds, employees, tierRef)) tracker.withSenior++;
    for (const sid of assignedIds) {
      const partner = employees.find((e) => e.id === sid);
      if (partner && classifyEmployee(partner.hireDate, tierRef) === "SENIOR") {
        tracker.seniorPartners.set(sid, (tracker.seniorPartners.get(sid) ?? 0) + 1);
      }
    }
  }
  trackers.set(emp.id, tracker);
}

export function generateAutoScheduleResult(input: AutoSchedulePlanInput): AutoScheduleResult {
  const { employees, shifts, preferences, existing, leaves, storeId, startDate, days, minPerShift = 1 } = input;
  const activeEmployees = employees.filter((e) => e.isActive && !e.deletedAt);
  const activeShifts = shifts
    .filter((s) => s.isActive && !s.deletedAt && (!s.storeId || s.storeId === storeId))
    .sort((a, b) => shiftStartMinutes(a) - shiftStartMinutes(b));
  const tierRef = dateOnly(startDate);
  const start = dateOnly(startDate);
  const plan: ProposedSchedule[] = [];
  const conflicts: ScheduleConflict[] = [];
  const trackers = new Map<string, Tracker>();
  for (const emp of activeEmployees) trackers.set(emp.id, initTracker(emp.id, existing, plan));

  for (let d = 0; d < days; d++) {
    const workDate = new Date(start.getTime() + d * 86400000);
    const weekday = workDate.getDay();
    const dateStr = workDate.toISOString().slice(0, 10);
    for (const shift of activeShifts) {
      const need = shiftHeadcount(shift, minPerShift);
      const assignedIds: string[] = [];
      const { startAt, endAt } = calcShiftTimes(workDate, shift);
      for (let slot = 0; slot < need; slot++) {
        const needMentor = assignedIds.some((id) => {
          const e = activeEmployees.find((x) => x.id === id);
          return e && classifyEmployee(e.hireDate, tierRef) === "NEW";
        });
        let picked: Employee | null = null;
        for (const tier of ["SENIOR", "REGULAR", "NEW"] as EmployeeTier[]) {
          picked = pickForSlot(
            activeEmployees.filter((e) => classifyEmployee(e.hireDate, tierRef) === tier),
            {
              shift,
              workDate,
              weekday,
              preferences,
              leaves,
              storeId,
              existing,
              plan,
              shifts: activeShifts,
              employees: activeEmployees,
              tierRef,
              assignedIds,
              needMentor,
              trackers,
              daysInMonth: days,
            },
          );
          if (picked) break;
        }
        if (!picked) {
          picked = pickForSlot(activeEmployees, {
            shift,
            workDate,
            weekday,
            preferences,
            leaves,
            storeId,
            existing,
            plan,
            shifts: activeShifts,
            employees: activeEmployees,
            tierRef,
            assignedIds,
            needMentor: false,
            trackers,
            daysInMonth: days,
          });
        }
        if (!picked) {
          conflicts.push({
            date: dateStr,
            shiftName: shift.name,
            missing: need - assignedIds.length,
            rule: "每個班別達到需求人數",
            reason: `可排班人力不足，尚缺 ${need - assignedIds.length} 人`,
            suggestion: "放寬請假／偏好限制、調整需求人數，或增加可排班員工",
          });
          break;
        }
        plan.push({ employeeId: picked.id, shiftId: shift.id, storeId, workDate: dateOnly(workDate), startAt, endAt });
        assignedIds.push(picked.id);
        recordAssignment(trackers, picked, shift, workDate, assignedIds.slice(0, -1), activeEmployees, tierRef);
      }
    }
  }

  for (const emp of activeEmployees) {
    const tracker = trackers.get(emp.id)!;
    if (tracker.saturday + tracker.sunday > 0) continue;
    for (let d = 0; d < days; d++) {
      const workDate = new Date(start.getTime() + d * 86400000);
      const weekday = workDate.getDay();
      if (weekday !== 6 && weekday !== 0) continue;
      for (const shift of activeShifts) {
        if (canAssignHard({ emp, shift, workDate, weekday, preferences, leaves, storeId, existing, plan, shifts: activeShifts, tracker: trackers.get(emp.id)!, daysInMonth: days })) continue;
        const current = plan.filter((p) => p.shiftId === shift.id && sameDay(p.workDate, workDate)).length;
        if (current >= shiftHeadcount(shift, minPerShift)) continue;
        const mates = plan.filter((p) => p.shiftId === shift.id && sameDay(p.workDate, workDate));
        if (classifyEmployee(emp.hireDate, tierRef) === "NEW" && !shiftHasMentor(mates.map((m) => m.employeeId), activeEmployees, tierRef)) continue;
        const { startAt, endAt } = calcShiftTimes(workDate, shift);
        plan.push({ employeeId: emp.id, shiftId: shift.id, storeId, workDate: dateOnly(workDate), startAt, endAt });
        recordAssignment(trackers, emp, shift, workDate, mates.map((m) => m.employeeId), activeEmployees, tierRef);
        break;
      }
      if ((trackers.get(emp.id)?.saturday ?? 0) + (trackers.get(emp.id)?.sunday ?? 0) > 0) break;
    }
  }

  const report = buildAutoScheduleReport({
    employees,
    shifts,
    preferences,
    leaves,
    existing,
    plan,
    storeId,
    startDate,
    days,
    tierRefDate: tierRef,
    conflicts,
  });
  return { plan, report, reportText: formatReportText(report) };
}

export function generateAutoSchedulePlan(input: AutoSchedulePlanInput): ProposedSchedule[] {
  return generateAutoScheduleResult(input).plan;
}
