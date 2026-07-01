"use client";

import { useActionState } from "react";
import { createSupplierAction, updateSupplierAction } from "@/modules/purchasing/actions";
import { initialFormState } from "@/lib/forms";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export type SupplierDefaults = {
  id: string;
  code: string;
  name: string;
  contact?: string | null;
  phone?: string | null;
  email?: string | null;
};

export function SupplierForm({ defaults }: { defaults?: SupplierDefaults }) {
  const isEdit = Boolean(defaults?.id);
  const [state, action, pending] = useActionState(
    isEdit ? updateSupplierAction : createSupplierAction,
    initialFormState,
  );

  return (
    <form action={action} className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:gap-2">
      {isEdit && <input type="hidden" name="id" value={defaults!.id} />}
      <div className="w-full sm:w-auto">
        <label className="mb-1 block text-xs text-gray-500">代碼</label>
        <Input
          name="code"
          required
          readOnly={isEdit}
          defaultValue={defaults?.code}
          className="w-full sm:w-28"
        />
      </div>
      <div className="w-full sm:w-auto">
        <label className="mb-1 block text-xs text-gray-500">名稱</label>
        <Input name="name" required defaultValue={defaults?.name} className="w-full sm:w-44" />
      </div>
      <div className="w-full sm:w-auto">
        <label className="mb-1 block text-xs text-gray-500">聯絡人</label>
        <Input name="contact" defaultValue={defaults?.contact ?? ""} className="w-full sm:w-28" />
      </div>
      <div className="w-full sm:w-auto">
        <label className="mb-1 block text-xs text-gray-500">電話</label>
        <Input name="phone" defaultValue={defaults?.phone ?? ""} className="w-full sm:w-32" />
      </div>
      {!isEdit && (
        <div className="w-full sm:w-auto">
          <label className="mb-1 block text-xs text-gray-500">Email</label>
          <Input name="email" type="email" className="w-full sm:w-40" />
        </div>
      )}
      {isEdit && (
        <input type="hidden" name="email" value={defaults?.email ?? ""} />
      )}
      <Button type="submit" disabled={pending} className="w-full sm:w-auto">
        {pending ? "儲存中…" : isEdit ? "儲存變更" : "新增供應商"}
      </Button>
      {state.message && (
        <span className={`text-sm ${state.ok ? "text-green-600" : "text-red-600"}`}>
          {state.message}
        </span>
      )}
    </form>
  );
}
