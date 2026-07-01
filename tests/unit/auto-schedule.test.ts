import { describe, expect, it } from "vitest";
import type { Employee, Shift } from "@prisma/client";
import { generateAutoScheduleResult } from "@/modules/hr/auto-schedule";
import { classifyEmployee, sameDay } from "@/modules/hr/auto-schedule-utils";

function emp(partial: Partial<Employee> & { id: string; name: string }): Employee {
  return {
    id: partial.id,
    companyId: "c1",
    userId: null,
    employeeNo: partial.employeeNo ?? partial.id,
    name: partial.name,
    phone: null,
    email: null,
    departmentId: null,
    positionId: null,
    employmentTypeId: null,
    primaryStoreId: null,
    hireDate: partial.hireDate ?? null,
    minMonthlyShifts: partial.minMonthlyShifts ?? null,
    maxMonthlyShifts: partial.maxMonthlyShifts ?? null,
    hourlyRate: null,
    isActive: partial.isActive ?? true,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };
}

function shift(partial: Partial<Shift> & { id: string; code: string; name: string }): Shift {
  return {
    id: partial.id,
    companyId: "c1",
    storeId: null,
    code: partial.code,
    name: partial.name,
    startTime: partial.startTime ?? "08:00",
    endTime: partial.endTime ?? "16:00",
    requiredHeadcount: partial.requiredHeadcount ?? 1,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };
}

describe("classifyEmployee", () => {
  const ref = new Date("2026-07-01");

  it("入職未滿 90 天為新人", () => {
    expect(classifyEmployee(new Date("2026-05-01"), ref)).toBe("NEW");
  });

  it("入職超過 180 天為老員工", () => {
    expect(classifyEmployee(new Date("2025-01-01"), ref)).toBe("SENIOR");
  });
});

describe("generateAutoScheduleResult", () => {
  const startDate = new Date("2026-07-01");
  const days = 7;
  const shifts = [
    shift({ id: "s1", code: "AM", name: "早班", startTime: "08:00", endTime: "16:00", requiredHeadcount: 1 }),
    shift({ id: "s2", code: "PM", name: "晚班", startTime: "16:00", endTime: "22:00", requiredHeadcount: 1 }),
  ];

  it("不會把員工排在請假日期", () => {
    const employees = [
      emp({ id: "e1", name: "老員工", hireDate: new Date("2024-01-01") }),
      emp({ id: "e2", name: "新人", hireDate: new Date("2026-06-01") }),
    ];
    const { plan } = generateAutoScheduleResult({
      employees,
      shifts,
      preferences: [],
      existing: [],
      leaves: [
        {
          id: "l1",
          companyId: "c1",
          employeeId: "e1",
          type: "PERSONAL",
          startAt: new Date("2026-07-02T00:00:00"),
          endAt: new Date("2026-07-02T23:59:59"),
          hours: { toString: () => "8" } as unknown as import("@prisma/client/runtime/library").Decimal,
          reason: null,
          status: "APPROVED",
          approvedBy: null,
          approvedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      storeId: "store1",
      startDate,
      days,
    });
    const leaveDay = new Date("2026-07-02");
    const onLeave = plan.filter((p) => p.employeeId === "e1" && sameDay(p.workDate, leaveDay));
    expect(onLeave).toHaveLength(0);
  });

  it("新人班次應與老員工或一般員工搭班", () => {
    const employees = [
      emp({ id: "senior", name: "資深", hireDate: new Date("2023-01-01") }),
      emp({ id: "newbie", name: "小新", hireDate: new Date("2026-06-15") }),
    ];
    const { plan, report } = generateAutoScheduleResult({
      employees,
      shifts: [shift({ id: "s1", code: "AM", name: "早班", requiredHeadcount: 2 })],
      preferences: [],
      existing: [],
      leaves: [],
      storeId: "store1",
      startDate,
      days: 3,
    });
    expect(plan.length).toBeGreaterThan(0);
    const soloNewbie = report.validations.find((v) => v.rule.includes("新人單獨值班"));
    expect(soloNewbie?.status).not.toBe("fail");
  });
});
