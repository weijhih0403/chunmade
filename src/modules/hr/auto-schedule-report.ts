import type { Employee, EmployeePreference, LeaveRequest, Schedule, Shift } from "@prisma/client";
import type { ProposedSchedule } from "./auto-schedule-utils";
import {
  classifyEmployee,
  dateOnly,
  sameDay,
  type EmployeeTier,
} from "./auto-schedule-utils";

export type RuleStatus = "pass" | "fail" | "warn";

export type RuleCheck = {
  rule: string;
  status: RuleStatus;
  detail: string;
};

export type EmployeeScheduleStats = {
  employeeId: string;
  name: string;
  hireDate: Date | null;
  tier: EmployeeTier;
  total: number;
  weekday: number;
  saturday: number;
  sunday: number;
  earlyShifts: number;
  lateShifts: number;
  seniorPairRatio: number | null;
  seniorSubstituteNote?: string;
};

export type ScheduleConflict = {
  date: string;
  shiftName: string;
  missing: number;
  rule: string;
  reason: string;
  suggestion: string;
};

export type AutoScheduleReport = {
  validations: RuleCheck[];
  conflicts: ScheduleConflict[];
  stats: EmployeeScheduleStats[];
  summary: string;
};

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
  const start = shiftStartMinutes(shift);
  return start === Math.min(...all.map(shiftStartMinutes));
}

function isLateShift(shift: Shift, all: Shift[]): boolean {
  const end = shiftEndMinutes(shift);
  return end === Math.max(...all.map(shiftEndMinutes));
}

function maxConsecutiveDays(dates: Date[]): number {
  if (dates.length === 0) return 0;
  const sorted = [...new Set(dates.map((d) => dateOnly(d).getTime()))].sort((a, b) => a - b);
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
  rows: Array<{ employeeId: string; workDate: Date; shiftId: string }>,
  shifts: Shift[],
): boolean {
  if (!isEarlyShift(shift, shifts)) return false;
  const yesterday = new Date(dateOnly(day).getTime() - 86400000);
  const prev = rows.find((r) => r.employeeId === employeeId && sameDay(r.workDate, yesterday));
  if (!prev) return false;
  const prevShift = shifts.find((s) => s.id === prev.shiftId);
  return Boolean(prevShift && isLateShift(prevShift, shifts));
}

function statusIcon(status: RuleStatus): string {
  if (status === "pass") return "✅";
  if (status === "fail") return "❌";
  return "⚠️";
}

export function buildAutoScheduleReport(input: {
  employees: Employee[];
  shifts: Shift[];
  preferences: EmployeePreference[];
  leaves: LeaveRequest[];
  existing: Schedule[];
  plan: ProposedSchedule[];
  storeId: string;
  startDate: Date;
  days: number;
  tierRefDate: Date;
  conflicts: ScheduleConflict[];
}): AutoScheduleReport {
  const { employees, shifts, preferences, leaves, existing, plan, startDate, days, tierRefDate, conflicts } =
    input;

  const activeShifts = shifts.filter((s) => s.isActive && !s.deletedAt);
  const shiftById = new Map(activeShifts.map((s) => [s.id, s]));
  const empById = new Map(employees.map((e) => [e.id, e]));
  const allRows = [
    ...existing.map((s) => ({
      employeeId: s.employeeId,
      workDate: s.workDate,
      shiftId: s.shiftId,
    })),
    ...plan.map((s) => ({
      employeeId: s.employeeId,
      workDate: s.workDate,
      shiftId: s.shiftId,
    })),
  ];

  const validations: RuleCheck[] = [];

  // 1. 不能上班時間
  let blockedViolations = 0;
  for (const row of plan) {
    const emp = empById.get(row.employeeId);
    const shift = shiftById.get(row.shiftId);
    if (!emp || !shift) continue;
    if (
      leaves.some(
        (l) =>
          l.employeeId === row.employeeId &&
          l.status === "APPROVED" &&
          l.startAt <= row.endAt &&
          l.endAt >= row.startAt,
      )
    ) {
      blockedViolations++;
    }
    const weekday = row.workDate.getDay();
    const dayPrefs = preferences.filter((p) => p.employeeId === emp.id && p.weekday === weekday);
    if (dayPrefs.length > 0) {
      const forShift = dayPrefs.filter((p) => p.shiftId == null || p.shiftId === shift.id);
      if (forShift.length > 0 && forShift.every((p) => !p.available)) blockedViolations++;
      const specific = forShift.filter((p) => p.shiftId === shift.id);
      if (specific.some((p) => !p.available)) blockedViolations++;
    }
  }
  validations.push({
    rule: "是否有人被安排在不能上班的時間",
    status: blockedViolations === 0 ? "pass" : "fail",
    detail: blockedViolations === 0 ? "無違規" : `發現 ${blockedViolations} 筆違規排班`,
  });

  // 2. 班別需求人數
  const understaffed: string[] = [];
  const start = dateOnly(startDate);
  for (let d = 0; d < days; d++) {
    const workDate = new Date(start.getTime() + d * 86400000);
    const dateStr = workDate.toISOString().slice(0, 10);
    for (const shift of activeShifts) {
      const need = shift.requiredHeadcount ?? 1;
      const count = allRows.filter((r) => r.shiftId === shift.id && sameDay(r.workDate, workDate)).length;
      if (count < need) understaffed.push(`${dateStr} ${shift.name} 缺 ${need - count} 人`);
    }
  }
  validations.push({
    rule: "是否所有班別都達到需求人數",
    status: understaffed.length === 0 ? "pass" : understaffed.length <= 3 ? "warn" : "fail",
    detail: understaffed.length === 0 ? "全部達標" : understaffed.slice(0, 5).join("；"),
  });

  // stats per employee
  const stats: EmployeeScheduleStats[] = employees
    .filter((e) => e.isActive && !e.deletedAt)
    .map((emp) => {
      const tier = classifyEmployee(emp.hireDate, tierRefDate);
      const rows = allRows.filter((r) => r.employeeId === emp.id);
      let saturday = 0;
      let sunday = 0;
      let weekday = 0;
      let earlyShifts = 0;
      let lateShifts = 0;
      let withSenior = 0;
      let newbieShifts = 0;

      for (const row of rows) {
        const wd = row.workDate.getDay();
        if (wd === 6) saturday++;
        else if (wd === 0) sunday++;
        else weekday++;
        const sh = shiftById.get(row.shiftId);
        if (sh) {
          if (isEarlyShift(sh, activeShifts)) earlyShifts++;
          if (isLateShift(sh, activeShifts)) lateShifts++;
        }
        if (tier === "NEW") {
          newbieShifts++;
          const mates = rows.filter(
            (r) => r.shiftId === row.shiftId && sameDay(r.workDate, row.workDate) && r.employeeId !== emp.id,
          );
          const hasSeniorMate = mates.some((m) => {
            const mate = empById.get(m.employeeId);
            if (!mate) return false;
            const mateTier = classifyEmployee(mate.hireDate, tierRefDate);
            return mateTier === "SENIOR" || mateTier === "REGULAR";
          });
          if (hasSeniorMate) withSenior++;
        }
      }

      return {
        employeeId: emp.id,
        name: emp.name,
        hireDate: emp.hireDate,
        tier,
        total: rows.length,
        weekday,
        saturday,
        sunday,
        earlyShifts,
        lateShifts,
        seniorPairRatio: tier === "NEW" && newbieShifts > 0 ? withSenior / newbieShifts : null,
      };
    });

  // 3. 至少一個週末
  const noWeekend = stats.filter((s) => s.saturday + s.sunday === 0 && s.total > 0);
  const inactiveNoWeekend = stats.filter((s) => s.saturday + s.sunday === 0 && s.total === 0);
  validations.push({
    rule: "是否每個人至少上過一次星期六或星期日",
    status: noWeekend.length === 0 ? (inactiveNoWeekend.length > 0 ? "warn" : "pass") : "fail",
    detail:
      noWeekend.length === 0
        ? inactiveNoWeekend.length > 0
          ? `${inactiveNoWeekend.length} 位員工本月無班（可忽略）`
          : "全部達標"
        : `未達標：${noWeekend.map((s) => s.name).join("、")}`,
  });

  // 4. 新人單獨值班
  const soloNewbie: string[] = [];
  const seen = new Set<string>();
  for (const row of allRows) {
    const emp = empById.get(row.employeeId);
    if (!emp || classifyEmployee(emp.hireDate, tierRefDate) !== "NEW") continue;
    const key = `${row.workDate.toISOString().slice(0, 10)}:${row.shiftId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const mates = allRows.filter((r) => r.shiftId === row.shiftId && sameDay(r.workDate, row.workDate));
    if (mates.length === 1) {
      const sh = shiftById.get(row.shiftId);
      soloNewbie.push(`${key.split(":")[0]} ${sh?.name ?? ""} ${emp.name}`);
    }
  }
  validations.push({
    rule: "是否有新人單獨值班",
    status: soloNewbie.length === 0 ? "pass" : "warn",
    detail: soloNewbie.length === 0 ? "無" : soloNewbie.slice(0, 5).join("；"),
  });

  // 5. 新人搭班比例
  const newbieStats = stats.filter((s) => s.tier === "NEW" && s.seniorPairRatio != null);
  const below80 = newbieStats.filter((s) => (s.seniorPairRatio ?? 0) < 0.8);
  validations.push({
    rule: "每位新人的老員工搭班比例",
    status: below80.length === 0 ? "pass" : below80.length < newbieStats.length ? "warn" : "fail",
    detail:
      newbieStats.length === 0
        ? "無新人"
        : newbieStats
            .map((s) => `${s.name} ${Math.round((s.seniorPairRatio ?? 0) * 100)}%`)
            .join("；"),
  });

  // 6. 超過最多班數
  const overMax = stats.filter((s) => {
    const emp = empById.get(s.employeeId);
    const max = emp?.maxMonthlyShifts ?? days;
    return s.total > max;
  });
  validations.push({
    rule: "是否有人超過最多班數",
    status: overMax.length === 0 ? "pass" : "fail",
    detail: overMax.length === 0 ? "無" : overMax.map((s) => `${s.name}(${s.total})`).join("、"),
  });

  // 7. 未達最低班數
  const underMin = stats.filter((s) => {
    const emp = empById.get(s.employeeId);
    const min = emp?.minMonthlyShifts ?? 0;
    return min > 0 && s.total < min;
  });
  validations.push({
    rule: "是否有人未達最低班數",
    status: underMin.length === 0 ? "pass" : "warn",
    detail: underMin.length === 0 ? "無" : underMin.map((s) => `${s.name}(${s.total})`).join("、"),
  });

  // 8. 連續上班超過 5 天
  const overConsecutive = stats.filter((s) => {
    const dates = allRows.filter((r) => r.employeeId === s.employeeId).map((r) => r.workDate);
    return maxConsecutiveDays(dates) > 5;
  });
  validations.push({
    rule: "是否有人連續上班超過 5 天",
    status: overConsecutive.length === 0 ? "pass" : "warn",
    detail: overConsecutive.length === 0 ? "無" : overConsecutive.map((s) => s.name).join("、"),
  });

  // 9. 晚班接早班
  const lateEarly: string[] = [];
  for (const emp of employees) {
    for (const row of allRows.filter((r) => r.employeeId === emp.id)) {
      const shift = shiftById.get(row.shiftId);
      if (!shift || !isEarlyShift(shift, activeShifts)) continue;
      if (hasLateThenEarly(emp.id, row.workDate, shift, allRows, activeShifts)) {
        lateEarly.push(`${emp.name} ${row.workDate.toISOString().slice(0, 10)}`);
      }
    }
  }
  validations.push({
    rule: "是否有晚班後隔天接早班",
    status: lateEarly.length === 0 ? "pass" : "warn",
    detail: lateEarly.length === 0 ? "無" : [...new Set(lateEarly)].slice(0, 5).join("；"),
  });

  // 10. 公平性
  const activeTotals = stats.filter((s) => s.total > 0).map((s) => s.total);
  const spread = activeTotals.length > 0 ? Math.max(...activeTotals) - Math.min(...activeTotals) : 0;
  const weekendTotals = stats.map((s) => s.saturday + s.sunday);
  const weekendSpread =
    weekendTotals.length > 0 ? Math.max(...weekendTotals) - Math.min(...weekendTotals) : 0;
  validations.push({
    rule: "員工總班數與假日班數是否公平",
    status: spread <= 2 && weekendSpread <= 2 ? "pass" : spread <= 4 ? "warn" : "fail",
    detail: `總班數差距 ${spread}；假日班差距 ${weekendSpread}`,
  });

  const failCount = validations.filter((v) => v.status === "fail").length;
  const warnCount = validations.filter((v) => v.status === "warn").length;
  const summary = [
    `產生 ${plan.length} 筆排班`,
    `規則檢查：${validations.filter((v) => v.status === "pass").length} 通過`,
    warnCount > 0 ? `${warnCount} 警告` : null,
    failCount > 0 ? `${failCount} 未通過` : null,
    conflicts.length > 0 ? `${conflicts.length} 項衝突` : null,
  ]
    .filter(Boolean)
    .join("；");

  return { validations, conflicts, stats, summary };
}

export function formatReportText(report: AutoScheduleReport): string {
  const lines: string[] = [report.summary, "", "【規則檢查】"];
  for (const v of report.validations) {
    lines.push(`${statusIcon(v.status)} ${v.rule}：${v.detail}`);
  }
  if (report.conflicts.length > 0) {
    lines.push("", "【衝突與建議】");
    for (const c of report.conflicts.slice(0, 8)) {
      lines.push(`- ${c.date} ${c.shiftName}：${c.reason}（${c.suggestion}）`);
    }
  }
  return lines.join("\n");
}
