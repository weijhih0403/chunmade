"use client";

import { useState, useTransition } from "react";
import { submitApplication } from "./actions";

export function ApplyForm() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [ok, setOk] = useState(false);
  const [mailWarn, setMailWarn] = useState("");

  return (
    <form
      className="space-y-5"
      action={(fd) => {
        setError("");
        setOk(false);
        setMailWarn("");
        startTransition(async () => {
          const res = await submitApplication(fd);
          if (res.error) {
            setError(res.error);
            return;
          }
          setOk(true);
          if (res.mailStatus === "skipped") {
            setMailWarn(
              "申請已成功送出，但站台尚未設定寄信（SMTP），管理者可能收不到 Email；請改由其他方式通知管理者，或請管理者定期到後台「審核帳號」查看。",
            );
          } else if (res.mailStatus === "failed") {
            setMailWarn(
              "申請已成功送出，但通知信暫時無法寄出；請管理者到後台「審核帳號」查看待審核名單。",
            );
          }
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
      {mailWarn ? (
        <p className="rounded-xl border border-amber-500/35 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          {mailWarn}
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
