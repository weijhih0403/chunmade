"use client";

import { useActionState } from "react";
import { createSupplierAction } from "@/modules/purchasing/actions";
import { initialFormState } from "@/lib/forms";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function SupplierForm() {
  const [state, action, pending] = useActionState(createSupplierAction, initialFormState);
  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      <div>
        <label className="mb-1 block text-xs text-gray-500">代碼</label>
        <Input name="code" required className="w-28" />
      </div>
      <div>
        <label className="mb-1 block text-xs text-gray-500">名稱</label>
        <Input name="name" required className="w-44" />
      </div>
      <div>
        <label className="mb-1 block text-xs text-gray-500">聯絡人</label>
        <Input name="contact" className="w-28" />
      </div>
      <div>
        <label className="mb-1 block text-xs text-gray-500">電話</label>
        <Input name="phone" className="w-32" />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "新增中…" : "新增供應商"}
      </Button>
      {state.message && (
        <span className={`text-sm ${state.ok ? "text-green-600" : "text-red-600"}`}>
          {state.message}
        </span>
      )}
    </form>
  );
}
