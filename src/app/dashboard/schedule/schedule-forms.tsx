"use client";

import { useActionState } from "react";
import { createShiftAction, createScheduleAction } from "@/modules/hr/actions";
import { initialFormState } from "@/lib/forms";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";

type Opt = { id: string; name: string };

export function ShiftForm() {
  const [state, action, pending] = useActionState(createShiftAction, initialFormState);
  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      <div>
        <label className="mb-1 block text-xs text-gray-500">代碼</label>
        <Input name="code" required className="w-20" />
      </div>
      <div>
        <label className="mb-1 block text-xs text-gray-500">名稱</label>
        <Input name="name" required className="w-28" />
      </div>
      <div>
        <label className="mb-1 block text-xs text-gray-500">開始</label>
        <Input name="startTime" type="time" required className="w-28" />
      </div>
      <div>
        <label className="mb-1 block text-xs text-gray-500">結束</label>
        <Input name="endTime" type="time" required className="w-28" />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "新增中…" : "新增班別"}
      </Button>
      {state.message && (
        <span className={`text-sm ${state.ok ? "text-green-600" : "text-red-600"}`}>
          {state.message}
        </span>
      )}
    </form>
  );
}

export function ScheduleForm({
  employees,
  shifts,
  stores,
}: {
  employees: Opt[];
  shifts: Opt[];
  stores: Opt[];
}) {
  const [state, action, pending] = useActionState(createScheduleAction, initialFormState);
  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      <div>
        <label className="mb-1 block text-xs text-gray-500">員工</label>
        <Select name="employeeId" required defaultValue="" className="w-32">
          <option value="" disabled>
            請選擇
          </option>
          {employees.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <label className="mb-1 block text-xs text-gray-500">班別</label>
        <Select name="shiftId" required defaultValue="" className="w-28">
          <option value="" disabled>
            請選擇
          </option>
          {shifts.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <label className="mb-1 block text-xs text-gray-500">門市</label>
        <Select name="storeId" required defaultValue="" className="w-28">
          <option value="" disabled>
            請選擇
          </option>
          {stores.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <label className="mb-1 block text-xs text-gray-500">日期</label>
        <Input name="workDate" type="date" required className="w-40" />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "排班中…" : "排班"}
      </Button>
      {state.message && (
        <span className={`text-sm ${state.ok ? "text-green-600" : "text-red-600"}`}>
          {state.message}
        </span>
      )}
    </form>
  );
}
