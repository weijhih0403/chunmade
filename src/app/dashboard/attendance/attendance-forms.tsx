"use client";

import { useActionState } from "react";
import { clockAction, requestLeaveAction } from "@/modules/hr/actions";
import { initialFormState } from "@/lib/forms";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";

type Opt = { id: string; name: string };

const LEAVE_TYPES: { value: string; label: string }[] = [
  { value: "ANNUAL", label: "特休" },
  { value: "SICK", label: "病假" },
  { value: "PERSONAL", label: "事假" },
  { value: "OFFICIAL", label: "公假" },
  { value: "OTHER", label: "其他" },
];

export function ClockForm({ employees, token }: { employees: Opt[]; token: string | null }) {
  const [state, action, pending] = useActionState(clockAction, initialFormState);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="token" value={token ?? ""} />
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs text-gray-500">員工</label>
          <Select name="employeeId" required defaultValue="">
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
          <label className="mb-1 block text-xs text-gray-500">類型</label>
          <Select name="mode" defaultValue="IN">
            <option value="IN">上班</option>
            <option value="OUT">下班</option>
          </Select>
        </div>
      </div>
      <Button type="submit" disabled={pending || !token}>
        {pending ? "打卡中…" : "打卡"}
      </Button>
      {!token && <p className="text-xs text-amber-600">請先由管理員產生打卡碼。</p>}
      {state.message && (
        <p className={`text-sm ${state.ok ? "text-green-600" : "text-red-600"}`}>{state.message}</p>
      )}
    </form>
  );
}

export function LeaveForm({ employees }: { employees: Opt[] }) {
  const [state, action, pending] = useActionState(requestLeaveAction, initialFormState);
  return (
    <form action={action} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs text-gray-500">員工</label>
          <Select name="employeeId" required defaultValue="">
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
          <label className="mb-1 block text-xs text-gray-500">假別</label>
          <Select name="type" defaultValue="PERSONAL">
            {LEAVE_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs text-gray-500">開始</label>
          <Input name="startAt" type="datetime-local" required />
        </div>
        <div>
          <label className="mb-1 block text-xs text-gray-500">結束</label>
          <Input name="endAt" type="datetime-local" required />
        </div>
      </div>
      <Input name="reason" placeholder="事由（選填）" />
      <Button type="submit" disabled={pending}>
        {pending ? "送出中…" : "送出請假"}
      </Button>
      {state.message && (
        <p className={`text-sm ${state.ok ? "text-green-600" : "text-red-600"}`}>{state.message}</p>
      )}
    </form>
  );
}
