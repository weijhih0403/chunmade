"use client";

import { useState, useTransition } from "react";
import { submitApplication } from "./actions";

export function ApplyForm() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [ok, setOk] = useState(false);

  return (
    <form
      className="space-y-5"
      action={(fd) => {
        setError("");
        setOk(false);
        startTransition(async () => {
          const res = await submitApplication(fd);
          if (res.error) {
            setError(res.error);
            return;
          }
          setOk(true);
        });
      }}
    >
      <label className="block text-sm">
        <span className="text-[var(--foreground)]">帳號</span>
        <input
          name="username"
          required
          disabled={pending}
          className="mt-1 w-full rounded-xl border border-[var(--stroke)] bg-[var(--surface)] px-4 py-3 text-[var(--foreground)] outline-none focus:border-[var(--accent)]"
        />
      </label>
      <label className="block text-sm">
        <span className="text-[var(--foreground)]">密碼（至少 6 碼）</span>
        <input
          name="password"
          type="password"
          required
          minLength={6}
          disabled={pending}
          className="mt-1 w-full rounded-xl border border-[var(--stroke)] bg-[var(--surface)] px-4 py-3 text-[var(--foreground)] outline-none focus:border-[var(--accent)]"
        />
      </label>

      {error ? (
        <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </p>
      ) : null}
      {ok ? (
        <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
          申請已送出，請等待管理者審核。
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-full bg-[var(--accent)] py-3 text-sm font-semibold text-[var(--accent-foreground)] disabled:opacity-60"
      >
        {pending ? "送出中…" : "送出申請"}
      </button>
    </form>
  );
}
