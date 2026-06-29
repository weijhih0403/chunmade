"use client";

import { useActionState } from "react";
import { createEmployeeAction } from "@/modules/hr/actions";
import { initialFormState } from "@/lib/forms";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";

type Opt = { id: string; name: string };

export function EmployeeForm({ departments }: { departments: Opt[] }) {
  const [state, action, pending] = useActionState(createEmployeeAction, initialFormState);
  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      <div>
        <label className="mb-1 block text-xs text-gray-500">員工編號</label>
        <Input name="employeeNo" required className="w-28" />
      </div>
      <div>
        <label className="mb-1 block text-xs text-gray-500">姓名</label>
        <Input name="name" required className="w-32" />
      </div>
      <div>
        <label className="mb-1 block text-xs text-gray-500">電話</label>
        <Input name="phone" className="w-32" />
      </div>
      <div>
        <label className="mb-1 block text-xs text-gray-500">部門</label>
        <Select name="departmentId" defaultValue="" className="w-32">
          <option value="">（無）</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <label className="mb-1 block text-xs text-gray-500">時薪</label>
        <Input name="hourlyRate" type="number" step="0.01" className="w-24" />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "新增中…" : "新增員工"}
      </Button>
      {state.message && (
        <span className={`text-sm ${state.ok ? "text-green-600" : "text-red-600"}`}>
          {state.message}
        </span>
      )}
    </form>
  );
}
