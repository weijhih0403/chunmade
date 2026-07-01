import "server-only";
import { prisma } from "@/lib/db";
import { type Actor, companyScope } from "@/lib/permissions";

export async function listEmployees(actor: Actor) {
  const scope = companyScope(actor);
  const [employees, stores] = await Promise.all([
    prisma.employee.findMany({
      where: { ...scope, deletedAt: null },
      include: { position: true, employmentType: true },
      orderBy: { employeeNo: "asc" },
    }),
    prisma.store.findMany({
      where: { ...scope, deletedAt: null },
      select: { id: true, name: true },
    }),
  ]);
  const storeName = new Map(stores.map((s) => [s.id, s.name]));
  return employees.map((e) => ({
    ...e,
    storeName: e.primaryStoreId ? (storeName.get(e.primaryStoreId) ?? null) : null,
  }));
}

export async function listStores(actor: Actor) {
  const scope = companyScope(actor);
  return prisma.store.findMany({
    where: { ...scope, deletedAt: null, isActive: true },
    orderBy: { code: "asc" },
  });
}

export async function getEmployee(actor: Actor, id: string) {
  const scope = companyScope(actor);
  return prisma.employee.findFirst({
    where: { ...scope, id, deletedAt: null },
    include: { department: true, preferences: true },
  });
}

export async function listEmployeePreferences(actor: Actor, employeeId: string) {
  const scope = companyScope(actor);
  return prisma.employeePreference.findMany({
    where: { ...scope, employeeId },
    orderBy: [{ weekday: "asc" }, { shiftId: "asc" }],
  });
}

export async function listDepartments(actor: Actor) {
  const scope = companyScope(actor);
  return prisma.department.findMany({ where: { ...scope, deletedAt: null }, orderBy: { name: "asc" } });
}

export async function listShifts(actor: Actor) {
  const scope = companyScope(actor);
  return prisma.shift.findMany({
    where: { ...scope, deletedAt: null, isActive: true },
    orderBy: { code: "asc" },
  });
}

export async function listSchedules(actor: Actor, days = 14) {
  const scope = companyScope(actor);
  const from = new Date();
  from.setHours(0, 0, 0, 0);
  const to = new Date(from.getTime() + days * 86400000);
  const schedules = await prisma.schedule.findMany({
    where: { ...scope, deletedAt: null, workDate: { gte: from, lte: to } },
    include: { employee: { select: { name: true } }, shift: true },
    orderBy: [{ workDate: "asc" }, { startAt: "asc" }],
  });
  return schedules;
}

export async function listAttendances(actor: Actor) {
  const scope = companyScope(actor);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return prisma.attendance.findMany({
    where: { ...scope, workDate: today },
    include: { employee: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function listLeaves(actor: Actor) {
  const scope = companyScope(actor);
  return prisma.leaveRequest.findMany({
    where: { ...scope },
    include: { employee: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
}

export async function getActiveQrToken(actor: Actor) {
  const scope = companyScope(actor);
  return prisma.attendanceQrToken.findFirst({
    where: { ...scope, usedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });
}
