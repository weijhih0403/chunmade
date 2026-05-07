"use server";

import type {
  EmploymentType,
  PreferredShift,
  ShiftKind,
} from "@prisma/client";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

async function requireSession() {
  const session = await auth();
  if (!session?.user) throw new Error("未登入");
}

function parsePreferredShift(raw: unknown): PreferredShift {
  return String(raw) === "LATE" ? "LATE" : "EARLY";
}

function parseEmploymentType(raw: unknown): EmploymentType {
  return String(raw) === "PART_TIME" ? "PART_TIME" : "FULL_TIME";
}

export async function createEmployee(formData: FormData) {
  await requireSession();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "請輸入姓名" };

  const preferredShift = parsePreferredShift(formData.get("preferredShift"));
  const employmentType = parseEmploymentType(formData.get("employmentType"));

  const last = await prisma.employee.findFirst({
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });

  await prisma.employee.create({
    data: {
      name,
      sortOrder: (last?.sortOrder ?? 0) + 1,
      preferredShift,
      employmentType,
    },
  });

  revalidatePath("/dashboard/schedule");
  return { ok: true };
}

export async function updateEmployeeMeta(
  employeeId: string,
  preferredShift: PreferredShift,
  employmentType: EmploymentType,
) {
  await requireSession();
  await prisma.employee.update({
    where: { id: employeeId },
    data: { preferredShift, employmentType },
  });
  revalidatePath("/dashboard/schedule");
}

export async function deleteEmployee(employeeId: string) {
  await requireSession();
  await prisma.employee.delete({ where: { id: employeeId } });
  revalidatePath("/dashboard/schedule");
}

export async function setShiftUnavailable(
  employeeId: string,
  date: string,
  shift: ShiftKind,
  unavailable: boolean,
) {
  await requireSession();

  if (unavailable) {
    await prisma.shiftUnavailability
      .create({
        data: { employeeId, date, shift },
      })
      .catch(() => {});
  } else {
    await prisma.shiftUnavailability.deleteMany({
      where: { employeeId, date, shift },
    });
  }

  revalidatePath("/dashboard/schedule");
}
