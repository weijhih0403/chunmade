import type { Employee } from "@prisma/client";

export type ProposedSchedule = {
  employeeId: string;
  shiftId: string;
  storeId: string;
  workDate: Date;
  startAt: Date;
  endAt: Date;
};

export type EmployeeTier = "NEW" | "REGULAR" | "SENIOR";

export function dateOnly(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function sameDay(a: Date, b: Date): boolean {
  return dateOnly(a).getTime() === dateOnly(b).getTime();
}

/** 以排班月份第一天為基準：未滿 90 天新人、超過 180 天老員工 */
export function classifyEmployee(hireDate: Date | null | undefined, refDate: Date): EmployeeTier {
  if (!hireDate) return "REGULAR";
  const days = Math.floor((dateOnly(refDate).getTime() - dateOnly(hireDate).getTime()) / 86400000);
  if (days < 90) return "NEW";
  if (days > 180) return "SENIOR";
  return "REGULAR";
}

export function tenureDays(hireDate: Date | null | undefined, refDate: Date): number {
  if (!hireDate) return 0;
  return Math.floor((dateOnly(refDate).getTime() - dateOnly(hireDate).getTime()) / 86400000);
}

export function tierLabel(tier: EmployeeTier): string {
  if (tier === "NEW") return "新人";
  if (tier === "SENIOR") return "老員工";
  return "一般員工";
}

export function defaultMaxShifts(employee: Employee, daysInMonth: number): number {
  return employee.maxMonthlyShifts ?? Math.min(daysInMonth, 22);
}

export function defaultMinShifts(employee: Employee): number {
  return employee.minMonthlyShifts ?? 0;
}
