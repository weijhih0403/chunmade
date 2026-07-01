"use client";

import { useFormStatus } from "react-dom";
import { deleteEmployeeAction } from "@/modules/hr/actions";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";

type EmployeeOpt = { id: string; name: string; employeeNo: string };

export function EmployeeDeleteForm({
  employeeId,
  employeeName,
  otherEmployees,
}: {
  employeeId: string;
  employeeName: string;
  otherEmployees: EmployeeOpt[];
}) {
  return (
    <form action={deleteEmployeeAction} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="employeeId" value={employeeId} />
      <Select
        name="replaceWithEmployeeId"
        defaultValue=""
        className="h-8 min-w-32 text-xs"
        aria-label={`${employeeName} 的替換員工`}
      >
        <option value="">不替換班表</option>
        {otherEmployees.map((e) => (
          <option key={e.id} value={e.id}>
            替換成 {e.name}
          </option>
        ))}
      </Select>
      <DeleteButton employeeName={employeeName} otherEmployees={otherEmployees} />
    </form>
  );
}

function DeleteButton({
  employeeName,
  otherEmployees,
}: {
  employeeName: string;
  otherEmployees: EmployeeOpt[];
}) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant="ghost"
      size="sm"
      disabled={pending}
      aria-busy={pending}
      onClick={(e) => {
        const form = e.currentTarget.form;
        const replaceId = String(
          new FormData(form ?? undefined).get("replaceWithEmployeeId") ?? "",
        );
        const replacement = otherEmployees.find((emp) => emp.id === replaceId);
        const message = replacement
          ? `確定要刪除「${employeeName}」？\n未來班表將轉給「${replacement.name}」。`
          : `確定要刪除「${employeeName}」？`;
        if (!window.confirm(message)) e.preventDefault();
      }}
    >
      <span className="text-red-600">{pending ? "刪除中…" : "刪除"}</span>
    </Button>
  );
}
