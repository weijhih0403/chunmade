"use client";

import { useActionState } from "react";
import { saveEmployeePreferencesAction } from "@/modules/hr/actions";
import { initialFormState } from "@/lib/forms";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";

const WEEKDAY_LABELS = ["週日", "週一", "週二", "週三", "週四", "週五", "週六"];

type ShiftOpt = { id: string; name: string };
type PrefRow = {
  weekday: number;
  shiftId: string | null;
  available: boolean;
  preference: number;
};

export function EmployeePreferenceForm({
  employeeId,
  shifts,
  preferences,
}: {
  employeeId: string;
  shifts: ShiftOpt[];
  preferences: PrefRow[];
}) {
  const [state, action, pending] = useActionState(saveEmployeePreferencesAction, initialFormState);
  const prefByDay = new Map(preferences.map((p) => [p.weekday, p]));

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="employeeId" value={employeeId} />
      <p className="text-sm text-gray-500">
        設定每週可排班時段與偏好班別。分數越高越優先（0–10）；未勾選「可排」則自動排班會跳過。
      </p>
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs text-gray-500">
            <tr>
              <th className="px-3 py-2">星期</th>
              <th className="px-3 py-2">可排</th>
              <th className="px-3 py-2">偏好班別</th>
              <th className="px-3 py-2">偏好分數</th>
            </tr>
          </thead>
          <tbody>
            {WEEKDAY_LABELS.map((label, weekday) => {
              const pref = prefByDay.get(weekday);
              return (
                <tr key={weekday} className="border-t border-gray-100">
                  <td className="px-3 py-2 font-medium text-gray-800">{label}</td>
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      name={`pref_${weekday}_available`}
                      defaultChecked={pref?.available ?? true}
                      className="h-4 w-4"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <Select
                      name={`pref_${weekday}_shift`}
                      defaultValue={pref?.shiftId ?? ""}
                      className="min-w-28"
                    >
                      <option value="">不限班別</option>
                      {shifts.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </Select>
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      name={`pref_${weekday}_score`}
                      type="number"
                      min={0}
                      max={10}
                      defaultValue={pref?.preference ?? 5}
                      className="w-20"
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "儲存中…" : "儲存可排班偏好"}
        </Button>
        {state.message && (
          <span className={`text-sm ${state.ok ? "text-green-600" : "text-red-600"}`}>
            {state.message}
          </span>
        )}
      </div>
    </form>
  );
}
