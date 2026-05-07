import Link from "next/link";
import { ApplyForm } from "./ui";

export default function ApplyPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[var(--surface-deep)] px-4 py-14 sm:px-6">
      <div className="mx-auto max-w-xl rounded-3xl border border-[var(--stroke)] bg-[var(--elevated)]/90 p-6 shadow-[var(--shadow-card)] backdrop-blur-xl sm:p-8">
        <Link
          href="/login"
          className="text-sm text-[var(--muted)] transition hover:text-[var(--accent)]"
        >
          ← 返回登入
        </Link>
        <h1 className="mt-5 font-display text-3xl text-[var(--foreground)]">
          員工帳號申請
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
          送出後會進入待審核。管理者核准前無法登入。
        </p>

        <div className="mt-8">
          <ApplyForm />
        </div>
      </div>
    </div>
  );
}
