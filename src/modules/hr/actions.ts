"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { randomUUID } from "crypto";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requirePermission, requireAnyPermission, companyScope, assertStoreAccess } from "@/lib/permissions";
import { writeAudit } from "@/lib/audit";
import { BusinessRuleError, NotFoundError, ConflictError } from "@/lib/errors";
import { type FormState, toFormError } from "@/lib/forms";

const employeeSchema = z.object({
  employeeNo: z.string().min(1, "請輸入員工編號"),
  name: z.string().min(1, "請輸入姓名"),
  phone: z.string().optional().or(z.literal("")),
  departmentId: z.string().optional().or(z.literal("")),
  primaryStoreId: z.string().optional().or(z.literal("")),
  hourlyRate: z.string().optional().or(z.literal("")),
  hireDate: z.string().optional().or(z.literal("")),
  minMonthlyShifts: z.string().optional().or(z.literal("")),
  maxMonthlyShifts: z.string().optional().or(z.literal("")),
});

export async function createEmployeeAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  try {
    const actor = await requirePermission("employee.manage");
    const scope = companyScope(actor);
    const data = employeeSchema.parse({
      employeeNo: formData.get("employeeNo"),
      name: formData.get("name"),
      phone: formData.get("phone") ?? "",
      departmentId: formData.get("departmentId") ?? "",
      primaryStoreId: formData.get("primaryStoreId") ?? "",
      hourlyRate: formData.get("hourlyRate") ?? "",
      hireDate: formData.get("hireDate") ?? "",
      minMonthlyShifts: formData.get("minMonthlyShifts") ?? "",
      maxMonthlyShifts: formData.get("maxMonthlyShifts") ?? "",
    });
    const dup = await prisma.employee.findUnique({
      where: { companyId_employeeNo: { companyId: scope.companyId, employeeNo: data.employeeNo } },
    });
    if (dup) throw new ConflictError("員工編號已存在");
    await prisma.employee.create({
      data: {
        companyId: scope.companyId,
        employeeNo: data.employeeNo,
        name: data.name,
        phone: data.phone || null,
        departmentId: data.departmentId || null,
        primaryStoreId: data.primaryStoreId || null,
        hourlyRate: data.hourlyRate ? data.hourlyRate : null,
        hireDate: data.hireDate ? new Date(data.hireDate) : null,
        minMonthlyShifts: data.minMonthlyShifts ? Number(data.minMonthlyShifts) : null,
        maxMonthlyShifts: data.maxMonthlyShifts ? Number(data.maxMonthlyShifts) : null,
      },
    });
    revalidatePath("/dashboard/employees");
    return { ok: true, message: `員工「${data.name}」已建立` };
  } catch (err) {
    return toFormError(err);
  }
}

export async function updateEmployeeAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  try {
    const actor = await requirePermission("employee.manage");
    const scope = companyScope(actor);
    const id = String(formData.get("id") ?? "");
    const existing = await prisma.employee.findFirst({ where: { ...scope, id, deletedAt: null } });
    if (!existing) throw new NotFoundError("找不到員工");

    const data = employeeSchema.parse({
      employeeNo: existing.employeeNo,
      name: formData.get("name"),
      phone: formData.get("phone") ?? "",
      departmentId: formData.get("departmentId") ?? "",
      primaryStoreId: formData.get("primaryStoreId") ?? "",
      hourlyRate: formData.get("hourlyRate") ?? "",
      hireDate: formData.get("hireDate") ?? "",
      minMonthlyShifts: formData.get("minMonthlyShifts") ?? "",
      maxMonthlyShifts: formData.get("maxMonthlyShifts") ?? "",
    });

    const isActive = formData.get("isActive") === "on";

    await prisma.employee.update({
      where: { id },
      data: {
        name: data.name,
        phone: data.phone || null,
        departmentId: data.departmentId || null,
        primaryStoreId: data.primaryStoreId || null,
        hourlyRate: data.hourlyRate ? data.hourlyRate : null,
        hireDate: data.hireDate ? new Date(data.hireDate) : null,
        minMonthlyShifts: data.minMonthlyShifts ? Number(data.minMonthlyShifts) : null,
        maxMonthlyShifts: data.maxMonthlyShifts ? Number(data.maxMonthlyShifts) : null,
        isActive,
      },
    });
    revalidatePath("/dashboard/employees");
    revalidatePath(`/dashboard/employees/${id}/edit`);
    return { ok: true, message: `員工「${data.name}」已更新` };
  } catch (err) {
    return toFormError(err);
  }
}

/** 刪除員工：軟刪除，可選將未來班表轉給其他員工 */
export async function deleteEmployeeAction(formData: FormData) {
  const actor = await requirePermission("employee.manage");
  const scope = companyScope(actor);
  const id = String(formData.get("employeeId") ?? "");
  const replaceId = String(formData.get("replaceWithEmployeeId") ?? "").trim() || null;

  const employee = await prisma.employee.findFirst({
    where: { ...scope, id, deletedAt: null },
  });
  if (!employee) throw new NotFoundError("找不到員工");
  if (replaceId === id) throw new BusinessRuleError("替換員工不可與刪除對象相同");

  let replacement: { id: string; name: string } | null = null;
  if (replaceId) {
    replacement = await prisma.employee.findFirst({
      where: { ...scope, id: replaceId, deletedAt: null, isActive: true },
      select: { id: true, name: true },
    });
    if (!replacement) throw new NotFoundError("找不到替換員工");
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let transferred = 0;
  let skipped = 0;

  await prisma.$transaction(async (tx) => {
    if (replacement) {
      const futureSchedules = await tx.schedule.findMany({
        where: {
          companyId: scope.companyId,
          employeeId: id,
          deletedAt: null,
          workDate: { gte: today },
        },
        orderBy: { workDate: "asc" },
      });

      for (const sched of futureSchedules) {
        const conflict = await tx.schedule.findFirst({
          where: {
            employeeId: replacement.id,
            workDate: sched.workDate,
            deletedAt: null,
          },
        });
        if (conflict) {
          skipped++;
          continue;
        }

        const transferNote = `自 ${employee.name} 轉移`;
        await tx.schedule.update({
          where: { id: sched.id },
          data: {
            employeeId: replacement.id,
            note: sched.note ? `${sched.note}; ${transferNote}` : transferNote,
          },
        });
        transferred++;
      }
    }

    await tx.employee.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false, userId: null },
    });

    await writeAudit(tx, {
      companyId: scope.companyId,
      userId: actor.id,
      action: "DELETE",
      entityType: "Employee",
      entityId: id,
      before: { employeeNo: employee.employeeNo, name: employee.name },
      after: replacement
        ? { replacedBy: replacement.id, transferred, skipped }
        : undefined,
    });
  });

  revalidatePath("/dashboard/employees");
  revalidatePath("/dashboard/schedule");
  if (replacement) {
    redirect(
      `/dashboard/employees?deleted=1&transferred=${transferred}&skipped=${skipped}`,
    );
  }
  redirect("/dashboard/employees?deleted=1");
}

const shiftSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  startTime: z.string().min(1),
  endTime: z.string().min(1),
  requiredHeadcount: z.coerce.number().int().min(1).max(20).optional(),
});

export async function createShiftAction(_prev: FormState, formData: FormData): Promise<FormState> {
  try {
    const actor = await requirePermission("schedule.manage");
    const scope = companyScope(actor);
    const data = shiftSchema.parse({
      code: formData.get("code"),
      name: formData.get("name"),
      startTime: formData.get("startTime"),
      endTime: formData.get("endTime"),
      requiredHeadcount: formData.get("requiredHeadcount") ?? 1,
    });
    const dup = await prisma.shift.findUnique({
      where: { companyId_code: { companyId: scope.companyId, code: data.code } },
    });
    if (dup) throw new ConflictError("班別代碼已存在");
    await prisma.shift.create({
      data: {
        companyId: scope.companyId,
        code: data.code,
        name: data.name,
        startTime: data.startTime,
        endTime: data.endTime,
        requiredHeadcount: data.requiredHeadcount ?? 1,
      },
    });
    revalidatePath("/dashboard/schedule");
    return { ok: true, message: `班別「${data.name}」已建立` };
  } catch (err) {
    return toFormError(err);
  }
}

const scheduleSchema = z.object({
  employeeId: z.string().min(1, "請選擇員工"),
  shiftId: z.string().min(1, "請選擇班別"),
  storeId: z.string().min(1, "請選擇門市"),
  workDate: z.string().min(1, "請選擇日期"),
});

export async function createScheduleAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  try {
    const actor = await requirePermission("schedule.manage");
    const scope = companyScope(actor);
    const data = scheduleSchema.parse({
      employeeId: formData.get("employeeId"),
      shiftId: formData.get("shiftId"),
      storeId: formData.get("storeId"),
      workDate: formData.get("workDate"),
    });
    assertStoreAccess(actor, data.storeId);

    const shift = await prisma.shift.findFirst({ where: { ...scope, id: data.shiftId } });
    if (!shift) throw new NotFoundError("找不到班別");

    const workDate = new Date(`${data.workDate}T00:00:00`);
    const startAt = new Date(`${data.workDate}T${shift.startTime}:00`);
    let endAt = new Date(`${data.workDate}T${shift.endTime}:00`);
    if (endAt <= startAt) endAt = new Date(endAt.getTime() + 86400000); // 跨夜班

    const dup = await prisma.schedule.findFirst({
      where: { employeeId: data.employeeId, workDate, shiftId: data.shiftId },
    });
    if (dup) throw new ConflictError("該員工此日此班別已排班");

    await prisma.schedule.create({
      data: {
        companyId: scope.companyId,
        storeId: data.storeId,
        employeeId: data.employeeId,
        shiftId: data.shiftId,
        workDate,
        startAt,
        endAt,
        createdBy: actor.id,
      },
    });
    revalidatePath("/dashboard/schedule");
    return { ok: true, message: "已排班" };
  } catch (err) {
    return toFormError(err);
  }
}

/** 產生動態打卡 QR Token（90 秒有效） */
export async function generateQrTokenAction(formData: FormData) {
  const actor = await requirePermission("attendance.manage");
  const scope = companyScope(actor);
  const storeId = String(formData.get("storeId") || actor.storeIds[0] || "");
  if (!storeId) throw new BusinessRuleError("請指定門市");
  assertStoreAccess(actor, storeId);

  await prisma.attendanceQrToken.create({
    data: {
      companyId: scope.companyId,
      storeId,
      token: randomUUID(),
      expiresAt: new Date(Date.now() + 90_000),
    },
  });
  revalidatePath("/dashboard/attendance");
}

const clockSchema = z.object({
  token: z.string().min(1, "缺少打卡 Token"),
  employeeId: z.string().min(1, "請選擇員工"),
  mode: z.enum(["IN", "OUT"]),
});

/** 員工打卡（驗證動態 QR Token） */
export async function clockAction(_prev: FormState, formData: FormData): Promise<FormState> {
  try {
    const actor = await requirePermission("attendance.clock");
    const scope = companyScope(actor);
    const data = clockSchema.parse({
      token: formData.get("token"),
      employeeId: formData.get("employeeId"),
      mode: formData.get("mode"),
    });

    await prisma.$transaction(async (tx) => {
      const token = await tx.attendanceQrToken.findFirst({
        where: { ...scope, token: data.token },
      });
      if (!token) throw new BusinessRuleError("無效的打卡碼");
      if (token.usedAt) throw new BusinessRuleError("打卡碼已使用，請重新產生");
      if (token.expiresAt < new Date()) throw new BusinessRuleError("打卡碼已過期，請重新產生");

      const workDate = new Date();
      workDate.setHours(0, 0, 0, 0);

      let attendance = await tx.attendance.findFirst({
        where: { employeeId: data.employeeId, workDate, storeId: token.storeId },
      });
      const now = new Date();

      if (data.mode === "IN") {
        if (attendance?.clockInAt) throw new BusinessRuleError("今日已上班打卡");
        attendance = attendance
          ? await tx.attendance.update({
              where: { id: attendance.id },
              data: { clockInAt: now, qrTokenId: token.id },
            })
          : await tx.attendance.create({
              data: {
                companyId: scope.companyId,
                storeId: token.storeId,
                employeeId: data.employeeId,
                workDate,
                clockInAt: now,
                qrTokenId: token.id,
              },
            });
      } else {
        if (!attendance?.clockInAt) throw new BusinessRuleError("尚未上班打卡");
        if (attendance.clockOutAt) throw new BusinessRuleError("今日已下班打卡");
        attendance = await tx.attendance.update({
          where: { id: attendance.id },
          data: { clockOutAt: now },
        });
      }

      await tx.attendanceQrToken.update({
        where: { id: token.id },
        data: { usedAt: now },
      });
      return attendance;
    });

    revalidatePath("/dashboard/attendance");
    return {
      ok: true,
      message: data.mode === "IN" ? "上班打卡成功" : "下班打卡成功",
    };
  } catch (err) {
    return toFormError(err);
  }
}

const leaveSchema = z.object({
  employeeId: z.string().min(1, "請選擇員工"),
  type: z.enum(["ANNUAL", "SICK", "PERSONAL", "OFFICIAL", "MARRIAGE", "FUNERAL", "MATERNITY", "OTHER"]),
  startAt: z.string().min(1),
  endAt: z.string().min(1),
  reason: z.string().optional(),
});

export async function requestLeaveAction(_prev: FormState, formData: FormData): Promise<FormState> {
  try {
    const actor = await requirePermission("leave.request");
    const scope = companyScope(actor);
    const data = leaveSchema.parse({
      employeeId: formData.get("employeeId"),
      type: formData.get("type"),
      startAt: formData.get("startAt"),
      endAt: formData.get("endAt"),
      reason: formData.get("reason") || undefined,
    });
    const start = new Date(data.startAt);
    const end = new Date(data.endAt);
    if (end <= start) throw new BusinessRuleError("結束時間需晚於開始時間");
    const hours = (end.getTime() - start.getTime()) / 3_600_000;

    await prisma.leaveRequest.create({
      data: {
        companyId: scope.companyId,
        employeeId: data.employeeId,
        type: data.type,
        startAt: start,
        endAt: end,
        hours,
        reason: data.reason ?? null,
      },
    });
    revalidatePath("/dashboard/attendance");
    return { ok: true, message: "請假申請已送出" };
  } catch (err) {
    return toFormError(err);
  }
}

export async function approveLeaveAction(formData: FormData) {
  const actor = await requirePermission("leave.approve");
  const scope = companyScope(actor);
  const id = String(formData.get("id"));
  const decision = String(formData.get("decision"));
  const leave = await prisma.leaveRequest.findFirst({ where: { ...scope, id } });
  if (!leave) throw new NotFoundError("找不到請假單");
  if (leave.status !== "PENDING") throw new BusinessRuleError("此請假單已處理");

  await prisma.$transaction(async (tx) => {
    await tx.leaveRequest.update({
      where: { id },
      data: {
        status: decision === "APPROVE" ? "APPROVED" : "REJECTED",
        approvedBy: actor.id,
        approvedAt: new Date(),
      },
    });
    await writeAudit(tx, {
      companyId: scope.companyId,
      userId: actor.id,
      action: decision === "APPROVE" ? "APPROVE_LEAVE" : "REJECT_LEAVE",
      entityType: "LeaveRequest",
      entityId: id,
    });
  });
  revalidatePath("/dashboard/attendance");
}

const WEEKDAYS = [0, 1, 2, 3, 4, 5, 6] as const;

/** 儲存員工每週可排班偏好（覆寫） */
export async function saveEmployeePreferencesAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  try {
    const actor = await requireAnyPermission(["employee.manage", "schedule.manage"]);
    const scope = companyScope(actor);
    const employeeId = String(formData.get("employeeId") ?? "");
    const employee = await prisma.employee.findFirst({
      where: { ...scope, id: employeeId, deletedAt: null },
    });
    if (!employee) throw new NotFoundError("找不到員工");

    const rows: Array<{
      weekday: number;
      shiftId: string | null;
      available: boolean;
      preference: number;
    }> = [];

    for (const wd of WEEKDAYS) {
      const available = formData.get(`pref_${wd}_available`) === "on";
      const shiftId = String(formData.get(`pref_${wd}_shift`) ?? "").trim() || null;
      const preference = Number(formData.get(`pref_${wd}_score`) ?? 0);
      rows.push({
        weekday: wd,
        shiftId,
        available,
        preference: Number.isFinite(preference) ? Math.max(0, Math.min(10, preference)) : 0,
      });
    }

    await prisma.$transaction(async (tx) => {
      await tx.employeePreference.deleteMany({ where: { companyId: scope.companyId, employeeId } });
      await tx.employeePreference.createMany({
        data: rows.map((r) => ({
          companyId: scope.companyId,
          employeeId,
          weekday: r.weekday,
          shiftId: r.shiftId,
          available: r.available,
          preference: r.preference,
        })),
      });
    });

    revalidatePath(`/dashboard/employees/${employeeId}/edit`);
    revalidatePath("/dashboard/schedule");
    return { ok: true, message: "可排班偏好已儲存" };
  } catch (err) {
    return toFormError(err);
  }
}

/** 自動排班：條件約束排班（整月） */
export async function autoGenerateScheduleAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  try {
    const actor = await requirePermission("schedule.manage");
    const scope = companyScope(actor);
    const storeId = String(formData.get("storeId") ?? "");
    const now = new Date();
    const year = Number(formData.get("year") ?? now.getFullYear());
    const month = Number(formData.get("month") ?? now.getMonth() + 1);
    const minPerShift = Math.min(5, Math.max(1, Number(formData.get("minPerShift") ?? 1)));
    const clearExisting = formData.get("clearExisting") === "on";

    if (!storeId) throw new BusinessRuleError("請選擇門市");
    if (month < 1 || month > 12) throw new BusinessRuleError("月份無效");
    assertStoreAccess(actor, storeId);

    const startDate = new Date(year, month - 1, 1);
    const days = new Date(year, month, 0).getDate();
    const endDate = new Date(year, month - 1, days, 23, 59, 59);

    const [employees, shifts, preferences, existing, leaves] = await Promise.all([
      prisma.employee.findMany({ where: { ...scope, deletedAt: null } }),
      prisma.shift.findMany({ where: { ...scope, deletedAt: null, isActive: true } }),
      prisma.employeePreference.findMany({ where: { companyId: scope.companyId } }),
      prisma.schedule.findMany({
        where: {
          ...scope,
          storeId,
          deletedAt: null,
          workDate: { gte: startDate, lte: endDate },
        },
      }),
      prisma.leaveRequest.findMany({
        where: {
          companyId: scope.companyId,
          status: "APPROVED",
          startAt: { lte: endDate },
          endAt: { gte: startDate },
        },
      }),
    ]);

    const { generateAutoScheduleResult } = await import("./auto-schedule");
    const { plan, report, reportText } = generateAutoScheduleResult({
      employees,
      shifts,
      preferences,
      existing: clearExisting ? [] : existing,
      leaves,
      storeId,
      startDate,
      days,
      minPerShift,
    });

    if (plan.length === 0) {
      return {
        ok: false,
        message: `無法產生排班：${reportText}`,
      };
    }

    await prisma.$transaction(async (tx) => {
      if (clearExisting) {
        await tx.schedule.updateMany({
          where: {
            companyId: scope.companyId,
            storeId,
            deletedAt: null,
            workDate: { gte: startDate, lte: endDate },
          },
          data: { deletedAt: new Date() },
        });
      }

      for (const row of plan) {
        await tx.schedule.create({
          data: {
            companyId: scope.companyId,
            storeId: row.storeId,
            employeeId: row.employeeId,
            shiftId: row.shiftId,
            workDate: row.workDate,
            startAt: row.startAt,
            endAt: row.endAt,
            note: "自動排班",
            createdBy: actor.id,
          },
        });
      }

      await writeAudit(tx, {
        companyId: scope.companyId,
        userId: actor.id,
        action: "AUTO_SCHEDULE",
        entityType: "Schedule",
        entityId: storeId,
        after: {
          count: plan.length,
          year,
          month,
          minPerShift,
          clearExisting,
          reportSummary: report.summary,
          validations: report.validations,
          conflicts: report.conflicts,
        },
      });
    });

    revalidatePath("/dashboard/schedule");
    return {
      ok: report.validations.every((v) => v.status !== "fail"),
      message: `已產生 ${year} 年 ${month} 月共 ${plan.length} 筆排班。\n\n${reportText}`,
    };
  } catch (err) {
    return toFormError(err);
  }
}
