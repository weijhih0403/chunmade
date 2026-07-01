"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { startOfBusinessDay } from "@/lib/dates";
import { writeAudit } from "@/lib/audit";
import { assertStoreAccess, companyScope, requirePermission } from "@/lib/permissions";
import { type FormState, toFormError } from "@/lib/forms";
import { nextDocumentNo } from "@/server/services/sequence";
import { shiftClosingSchema } from "./schemas";

type ShiftClosingCreate = {
  create: (args: { data: Record<string, unknown> }) => Promise<{ id: string; reportNo: string }>;
};

type PrismaWithShiftClosing = {
  shiftClosingReport: ShiftClosingCreate;
};

export async function createShiftClosingAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  try {
    const actor = await requirePermission("sales.shift");
    const scope = companyScope(actor);
    const data = shiftClosingSchema.parse({
      storeId: formData.get("storeId"),
      closingDate: (formData.get("closingDate") as string) || undefined,
      qty520: formData.get("qty520"),
      qty850: formData.get("qty850"),
      qty700: formData.get("qty700"),
      qty500: formData.get("qty500"),
      signatureData: formData.get("signatureData"),
      signerName: formData.get("signerName") ?? "",
      matchedEmployeeId: formData.get("matchedEmployeeId") ?? "",
    });

    assertStoreAccess(actor, data.storeId);
    const closingDate = data.closingDate
      ? startOfBusinessDay(new Date(data.closingDate))
      : startOfBusinessDay();

    let signerName = data.signerName?.trim() || null;
    if (data.matchedEmployeeId) {
      const emp = await prisma.employee.findFirst({
        where: { ...scope, id: data.matchedEmployeeId, deletedAt: null },
        select: { name: true },
      });
      if (emp) signerName = emp.name;
    }

    const report = await prisma.$transaction(async (tx) => {
      const reportNo = await nextDocumentNo(tx, scope.companyId, "SHIFT_CLOSING");
      const created = await (tx as unknown as PrismaWithShiftClosing).shiftClosingReport.create({
        data: {
          companyId: scope.companyId,
          storeId: data.storeId,
          reportNo,
          closingDate,
          qty520: data.qty520,
          qty850: data.qty850,
          qty700: data.qty700,
          qty500: data.qty500,
          signatureData: data.signatureData,
          recognizedText: null,
          signerName,
          matchedEmployeeId: data.matchedEmployeeId || null,
          ocrConfidence: null,
          createdBy: actor.id,
        },
      });
      await writeAudit(tx, {
        companyId: scope.companyId,
        userId: actor.id,
        action: "CREATE",
        entityType: "ShiftClosingReport",
        entityId: created.id,
        after: {
          reportNo,
          signerName,
          qty520: data.qty520,
          qty850: data.qty850,
          qty700: data.qty700,
          qty500: data.qty500,
        },
      });
      return created;
    });

    revalidatePath("/dashboard/shift-closing");
    return { ok: true, message: `班結表 ${report.reportNo} 已送出` };
  } catch (err) {
    return toFormError(err);
  }
}
