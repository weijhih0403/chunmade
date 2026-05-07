import { auth } from "@/auth";
import Link from "next/link";

export default async function DashboardPage() {
  const session = await auth();
  const isAdmin = Boolean(session?.user?.isAdmin);

  return (
    <div className="space-y-10">
      <div>
        <h1 className="font-display text-3xl font-medium tracking-tight text-[var(--foreground)] sm:text-4xl">
          歡迎回來
        </h1>
        <p className="mt-2 max-w-xl text-[var(--muted)]">
          Hi，{session?.user?.name}。請從下方進入庫存或班表功能。
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <Link
          href="/dashboard/inventory"
          className="group rounded-2xl border border-[var(--stroke)] bg-[var(--elevated)] p-8 shadow-[var(--shadow-soft)] transition hover:border-[var(--accent)]/40"
        >
          <h2 className="font-display text-xl text-[var(--foreground)]">
            庫存
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-[var(--muted)]">
            管理品項、數量與備註。
          </p>
          <span className="mt-6 inline-flex items-center text-sm font-medium text-[var(--accent)] group-hover:underline">
            前往 →
          </span>
        </Link>

        <Link
          href="/dashboard/schedule"
          className="group rounded-2xl border border-[var(--stroke)] bg-[var(--elevated)] p-8 shadow-[var(--shadow-soft)] transition hover:border-[var(--accent)]/40"
        >
          <h2 className="font-display text-xl text-[var(--foreground)]">
            班表
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-[var(--muted)]">
            設定員工、勾選不可排時段；每日早班與晚班各自動排 2 人，並可下載 Excel。
          </p>
          <span className="mt-6 inline-flex items-center text-sm font-medium text-[var(--accent)] group-hover:underline">
            前往 →
          </span>
        </Link>
        {isAdmin ? (
          <Link
            href="/dashboard/review-users"
            className="group rounded-2xl border border-[var(--stroke)] bg-[var(--elevated)] p-8 shadow-[var(--shadow-soft)] transition hover:border-[var(--accent)]/40"
          >
            <h2 className="font-display text-xl text-[var(--foreground)]">
              員工審核
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-[var(--muted)]">
              核准或拒絕新申請帳號。未核准者不得登入。
            </p>
            <span className="mt-6 inline-flex items-center text-sm font-medium text-[var(--accent)] group-hover:underline">
              前往 →
            </span>
          </Link>
        ) : null}
      </div>
    </div>
  );
}
