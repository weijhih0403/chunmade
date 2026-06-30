"use client";

import { useActionState } from "react";
import type { FormState } from "@/lib/forms";
import { initialFormState } from "@/lib/forms";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Action = (prev: FormState, formData: FormData) => Promise<FormState>;

export function CodeNameForm({ action, codeLabel = "代碼" }: { action: Action; codeLabel?: string }) {
  const [state, formAction, pending] = useActionState(action, initialFormState);

  return (
    <form action={formAction} className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:gap-2">
      <div className="w-full sm:w-auto">
        <label className="mb-1 block text-xs text-gray-500">{codeLabel}</label>
        <Input name="code" required className="w-full sm:w-32" />
      </div>
      <div className="w-full sm:w-auto">
        <label className="mb-1 block text-xs text-gray-500">名稱</label>
        <Input name="name" required className="w-full sm:w-48" />
      </div>
      <Button type="submit" disabled={pending} className="w-full sm:w-auto">
        {pending ? "新增中…" : "新增"}
      </Button>
      {state.message && (
        <span className={`text-sm ${state.ok ? "text-green-600" : "text-red-600"}`}>
          {state.message}
        </span>
      )}
    </form>
  );
}
