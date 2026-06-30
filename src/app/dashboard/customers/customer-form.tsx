"use client";

import { useActionState } from "react";
import { createCustomerAction } from "@/modules/crm/actions";
import { initialFormState } from "@/lib/forms";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function CustomerForm() {
  const [state, action, pending] = useActionState(createCustomerAction, initialFormState);
  return (
    <form action={action} className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:gap-2">
      <div className="w-full sm:w-auto">
        <label className="mb-1 block text-xs text-gray-500">姓名</label>
        <Input name="name" required className="w-full sm:w-36" />
      </div>
      <div className="w-full sm:w-auto">
        <label className="mb-1 block text-xs text-gray-500">電話</label>
        <Input name="phone" className="w-full sm:w-32" />
      </div>
      <div className="w-full sm:w-auto">
        <label className="mb-1 block text-xs text-gray-500">Email</label>
        <Input name="email" className="w-full sm:w-44" />
      </div>
      <label className="flex items-center gap-1 pb-2 text-sm text-gray-700">
        <input type="checkbox" name="asMember" className="h-4 w-4" /> 同時加入會員
      </label>
      <Button type="submit" disabled={pending} className="w-full sm:w-auto">
        {pending ? "新增中…" : "新增客戶"}
      </Button>
      {state.message && (
        <span className={`text-sm ${state.ok ? "text-green-600" : "text-red-600"}`}>
          {state.message}
        </span>
      )}
    </form>
  );
}
