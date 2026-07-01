"use client";

import { useActionState } from "react";
import { createShiftAction, createScheduleAction, autoGenerateScheduleAction } from "@/modules/hr/actions";
import { initialFormState } from "@/lib/forms";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";

type Opt = { id: string; name: string };

export function ShiftForm() {
  const [state, action, pending] = useActionState(createShiftAction, initialFormState);
  return (
    <form action={action} className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:gap-2">
      <div className="w-full sm:w-auto">
        <label className="mb-1 block text-xs text-gray-500">代碼</label>
        <Input name="code" required className="w-full sm:w-20" />
      </div>
      <div className="w-full sm:w-auto">
        <label className="mb-1 block text-xs text-gray-500">名稱</label>
        <Input name="name" required className="w-full sm:w-28" />
      </div>
      <div className="w-full sm:w-auto">
        <label className="mb-1 block text-xs text-gray-500">開始</label>
        <Input name="startTime" type="time" required className="w-full sm:w-28" />
      </div>
      <div className="w-full sm:w-auto">
        <label className="mb-1 block text-xs text-gray-500">結束</label>
        <Input name="endTime" type="time" required className="w-full sm:w-28" />
      </div>
      <div className="w-full sm:w-auto">
        <label className="mb-1 block text-xs text-gray-500">需求人數</label>
        <Input name="requiredHeadcount" type="number" min={1} max={20} defaultValue={1} className="w-full sm:w-20" />
      </div>
      <Button type="submit" disabled={pending} className="w-full sm:w-auto">
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
    <form action={action} className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:gap-2">
      <div className="w-full sm:w-auto">
        <label className="mb-1 block text-xs text-gray-500">員工</label>
        <Select name="employeeId" required defaultValue="" className="w-full sm:w-32">
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
      <div className="w-full sm:w-auto">
        <label className="mb-1 block text-xs text-gray-500">班別</label>
        <Select name="shiftId" required defaultValue="" className="w-full sm:w-28">
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
      <div className="w-full sm:w-auto">
        <label className="mb-1 block text-xs text-gray-500">門市</label>
        <Select name="storeId" required defaultValue="" className="w-full sm:w-28">
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
      <div className="w-full sm:w-auto">
        <label className="mb-1 block text-xs text-gray-500">日期</label>
        <Input name="workDate" type="date" required className="w-full sm:w-40" />
      </div>
      <Button type="submit" disabled={pending} className="w-full sm:w-auto">
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

export function AutoScheduleForm({ stores }: { stores: Opt[] }) {
  const [state, action, pending] = useActionState(autoGenerateScheduleAction, initialFormState);
  const now = new Date();
  return (
    <form action={action} className="space-y-3">
      <p className="text-sm text-gray-500">
        條件約束自動排班：遵守請假／偏好、班別需求人數、新人與老員工搭班、週末班、每月班數上下限、連續上班與晚接早等規則。不能上班的日期請用「請假」或「可排班偏好」設定。
      </p>
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:gap-2">
        <div className="w-full sm:w-auto">
          <label className="mb-1 block text-xs text-gray-500">門市</label>
          <Select name="storeId" required defaultValue="" className="w-full sm:w-40">
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
        <div className="w-full sm:w-auto">
          <label className="mb-1 block text-xs text-gray-500">年份</label>
          <Input name="year" type="number" defaultValue={now.getFullYear()} className="w-full sm:w-24" />
        </div>
        <div className="w-full sm:w-auto">
          <label className="mb-1 block text-xs text-gray-500">月份</label>
          <Input name="month" type="number" min={1} max={12} defaultValue={now.getMonth() + 1} className="w-full sm:w-20" />
        </div>
        <div className="w-full sm:w-auto">
          <label className="mb-1 block text-xs text-gray-500">預設每班人數</label>
          <Input
            name="minPerShift"
            type="number"
            min={1}
            max={5}
            defaultValue={1}
            className="w-full sm:w-20"
          />
        </div>
        <label className="flex items-center gap-1 pb-2 text-sm text-gray-700">
          <input type="checkbox" name="clearExisting" className="h-4 w-4" />
          清除該門市當月既有班表後重排
        </label>
        <Button type="submit" disabled={pending} className="w-full sm:w-auto">
          {pending ? "產生中…" : "自動排班"}
        </Button>
      </div>
      {state.message && (
        <pre
          className={`whitespace-pre-wrap rounded-lg px-3 py-2 text-sm ${
            state.ok ? "bg-green-50 text-green-800" : "bg-red-50 text-red-700"
          }`}
        >
          {state.message}
        </pre>
      )}
    </form>
  );
}
