"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requirePermission, companyScope, assertStoreAccess } from "@/lib/permissions";
import { writeAudit } from "@/lib/audit";
import { BusinessRuleError, NotFoundError, ConflictError } from "@/lib/errors";
import { type FormState, toFormError } from "@/lib/forms";

const employeeSchema = z.object({
  employeeNo: z.string().min(1, "請輸入員工編號"),
  name: z.string().min(1, "請輸入姓名"),
  phone: z.string().optional().or(z.literal("")),
  departmentId: z.string().optional().or(z.literal("")),
  hourlyRate: z.string().optional().or(z.literal("")),
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
      hourlyRate: formData.get("hourlyRate") ?? "",
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
        hourlyRate: data.hourlyRate ? data.hourlyRate : null,
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
      hourlyRate: formData.get("hourlyRate") ?? "",
    });

    const isActive = formData.get("isActive") === "on";

    await prisma.employee.update({
      where: { id },
      data: {
        name: data.name,
        phone: data.phone || null,
        departmentId: data.departmentId || null,
        hourlyRate: data.hourlyRate ? data.hourlyRate : null,
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

const shiftSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  startTime: z.string().min(1),
  endTime: z.string().min(1),
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
