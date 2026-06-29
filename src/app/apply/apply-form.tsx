"use client";

import Link from "next/link";
import { useActionState } from "react";
import { applyAction, type ActionState } from "@/modules/auth/actions";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

const initialState: ActionState = { ok: false, message: null };

export function ApplyForm() {
  const [state, formAction, pending] = useActionState(applyAction, initialState);

  if (state.ok && state.message) {
    return (
      <div className="space-y-4 text-center">
        <p className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">{state.message}</p>
        <Link href="/login" className="font-medium text-amber-700 hover:underline">
          返回登入
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <Label htmlFor="name">姓名</Label>
        <Input id="name" name="name" required />
        {state.fieldErrors?.name && (
          <p className="mt-1 text-xs text-red-600">{state.fieldErrors.name[0]}</p>
        )}
      </div>
      <div>
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" required />
        {state.fieldErrors?.email && (
          <p className="mt-1 text-xs text-red-600">{state.fieldErrors.email[0]}</p>
        )}
      </div>
      <div>
        <Label htmlFor="phone">電話（選填）</Label>
        <Input id="phone" name="phone" />
      </div>
      <div>
        <Label htmlFor="password">密碼（至少 8 碼）</Label>
        <Input id="password" name="password" type="password" required />
        {state.fieldErrors?.password && (
          <p className="mt-1 text-xs text-red-600">{state.fieldErrors.password[0]}</p>
        )}
      </div>
      <div>
        <Label htmlFor="confirmPassword">確認密碼</Label>
        <Input id="confirmPassword" name="confirmPassword" type="password" required />
        {state.fieldErrors?.confirmPassword && (
          <p className="mt-1 text-xs text-red-600">{state.fieldErrors.confirmPassword[0]}</p>
        )}
      </div>

      {state.message && !state.ok && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.message}</p>
      )}

      <Button type="submit" className="w-full" size="lg" disabled={pending}>
        {pending ? "送出中…" : "送出申請"}
      </Button>

      <p className="text-center text-sm text-gray-500">
        已有帳號？{" "}
        <Link href="/login" className="font-medium text-amber-700 hover:underline">
          返回登入
        </Link>
      </p>
    </form>
  );
}
