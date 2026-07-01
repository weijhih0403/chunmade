import "server-only";
import type { Employee, EmployeePreference, LeaveRequest, Schedule, Shift } from "@prisma/client";

export type ProposedSchedule = {
  employeeId: string;
  shiftId: string;
  storeId: string;
  workDate: Date;
  startAt: Date;
  endAt: Date;
};

export type AutoSchedulePlanInput = {
  employees: Employee[];
  shifts: Shift[];
  preferences: EmployeePreference[];
  existing: Schedule[];
  leaves: LeaveRequest[];
  storeId: string;
  startDate: Date;
  days: number;
  minPerShift: number;
};

function dateOnly(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function sameDay(a: Date, b: Date): boolean {
  return dateOnly(a).getTime() === dateOnly(b).getTime();
}

/** 計算班別起訖時間（支援跨夜） */
export function calcShiftTimes(workDate: Date, shift: Shift): { startAt: Date; endAt: Date } {
  const wd = workDate.toISOString().slice(0, 10);
  const startAt = new Date(`${wd}T${shift.startTime}:00`);
  let endAt = new Date(`${wd}T${shift.endTime}:00`);
  if (endAt <= startAt) endAt = new Date(endAt.getTime() + 86400000);
  return { startAt, endAt };
}

/** 員工是否在請假中（已核准） */
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

/**
 * 依 site 設計意圖（EmployeePreference）計算員工對某班別的適配分數。
 * - weekday：0=週日 … 6=週六
 * - available=false → 不可排
 * - preference 越大越優先；指定 shiftId 再 +5
 * - 無任何偏好設定 → 可排但分數 0（不優先）
 */
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

/** 產生自動排班草案（不寫入資料庫） */
export function generateAutoSchedulePlan(input: AutoSchedulePlanInput): ProposedSchedule[] {
  const {
    employees,
    shifts,
    preferences,
    existing,
    leaves,
    storeId,
    startDate,
    days,
    minPerShift,
  } = input;

  const activeEmployees = employees.filter((e) => e.isActive && !e.deletedAt);
  const activeShifts = shifts.filter((s) => s.isActive && !s.deletedAt);
  const start = dateOnly(startDate);
  const result: ProposedSchedule[] = [];
  const assignmentCount = new Map<string, number>();

  for (let d = 0; d < days; d++) {
    const workDate = new Date(start.getTime() + d * 86400000);
    const weekday = workDate.getDay();

    for (const shift of activeShifts) {
      if (shift.storeId && shift.storeId !== storeId) continue;

      const candidates: Array<{ employeeId: string; score: number }> = [];

      for (const emp of activeEmployees) {
        if (emp.primaryStoreId && emp.primaryStoreId !== storeId) continue;
        if (isOnApprovedLeave(emp.id, workDate, leaves)) continue;

        const alreadySame = existing.some(
          (s) => s.employeeId === emp.id && sameDay(s.workDate, workDate) && s.shiftId === shift.id,
        );
        const alreadyPlanned = result.some(
          (s) => s.employeeId === emp.id && sameDay(s.workDate, workDate) && s.shiftId === shift.id,
        );
        if (alreadySame || alreadyPlanned) continue;

        const sameDayOther = [
          ...existing.filter((s) => s.employeeId === emp.id && sameDay(s.workDate, workDate)),
          ...result.filter((s) => s.employeeId === emp.id && sameDay(s.workDate, workDate)),
        ];
        if (sameDayOther.length > 0) continue;

        const baseScore = scoreEmployeeForSlot(emp, shift, weekday, preferences);
        if (baseScore === null) continue;

        const fairnessPenalty = (assignmentCount.get(emp.id) ?? 0) * 2;
        candidates.push({ employeeId: emp.id, score: baseScore - fairnessPenalty });
      }

      candidates.sort((a, b) => b.score - a.score);
      const picked = candidates.slice(0, Math.max(1, minPerShift));
      const { startAt, endAt } = calcShiftTimes(workDate, shift);

      for (const c of picked) {
        result.push({
          employeeId: c.employeeId,
          shiftId: shift.id,
          storeId,
          workDate: dateOnly(workDate),
          startAt,
          endAt,
        });
        assignmentCount.set(c.employeeId, (assignmentCount.get(c.employeeId) ?? 0) + 1);
      }
    }
  }

  return result;
}
