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
    <form action={formAction} className="flex flex-wrap items-end gap-2">
      <div>
        <label className="mb-1 block text-xs text-gray-500">{codeLabel}</label>
        <Input name="code" required className="w-32" />
      </div>
      <div>
        <label className="mb-1 block text-xs text-gray-500">名稱</label>
        <Input name="name" required className="w-48" />
      </div>
      <Button type="submit" disabled={pending}>
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
