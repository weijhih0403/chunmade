"use client";

import { useActionState } from "react";
import { createEmployeeAction, updateEmployeeAction } from "@/modules/hr/actions";
import { initialFormState } from "@/lib/forms";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";

type Opt = { id: string; name: string };

export type EmployeeDefaults = {
  id: string;
  employeeNo: string;
  name: string;
  phone?: string | null;
  departmentId?: string | null;
  hourlyRate?: string | null;
  isActive: boolean;
};

export function EmployeeForm({
  departments,
  defaults,
}: {
  departments: Opt[];
  defaults?: EmployeeDefaults;
}) {
  const isEdit = Boolean(defaults?.id);
  const [state, action, pending] = useActionState(
    isEdit ? updateEmployeeAction : createEmployeeAction,
    initialFormState,
  );

  return (
    <form action={action} className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:gap-2">
      {isEdit && <input type="hidden" name="id" value={defaults!.id} />}
      <div className="w-full sm:w-auto">
        <label className="mb-1 block text-xs text-gray-500">員工編號</label>
        <Input
          name="employeeNo"
          required
          readOnly={isEdit}
          defaultValue={defaults?.employeeNo}
          className="w-full sm:w-28"
        />
      </div>
      <div className="w-full sm:w-auto">
        <label className="mb-1 block text-xs text-gray-500">姓名</label>
        <Input name="name" required defaultValue={defaults?.name} className="w-full sm:w-32" />
      </div>
      <div className="w-full sm:w-auto">
        <label className="mb-1 block text-xs text-gray-500">電話</label>
        <Input name="phone" defaultValue={defaults?.phone ?? ""} className="w-full sm:w-32" />
      </div>
      <div className="w-full sm:w-auto">
        <label className="mb-1 block text-xs text-gray-500">部門</label>
        <Select
          name="departmentId"
          defaultValue={defaults?.departmentId ?? ""}
          className="w-full sm:w-32"
        >
          <option value="">（無）</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </Select>
      </div>
      <div className="w-full sm:w-auto">
        <label className="mb-1 block text-xs text-gray-500">時薪</label>
        <Input
          name="hourlyRate"
          type="number"
          step="0.01"
          defaultValue={defaults?.hourlyRate ?? ""}
          className="w-full sm:w-24"
        />
      </div>
      {isEdit && (
        <label className="flex items-center gap-1 pb-2 text-sm text-gray-700">
          <input
            type="checkbox"
            name="isActive"
            defaultChecked={defaults?.isActive ?? true}
            className="h-4 w-4"
          />
          在職
        </label>
      )}
      <Button type="submit" disabled={pending} className="w-full sm:w-auto">
        {pending ? "儲存中…" : isEdit ? "儲存變更" : "新增員工"}
      </Button>
      {state.message && (
        <span className={`text-sm ${state.ok ? "text-green-600" : "text-red-600"}`}>
          {state.message}
        </span>
      )}
    </form>
  );
}
