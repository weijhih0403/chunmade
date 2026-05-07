import { auth } from "@/auth";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SignOutButton } from "./sign-out-button";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const isAdmin = Boolean(session.user.isAdmin);

  return (
    <div className="min-h-screen bg-[var(--surface)]">
      <header className="sticky top-0 z-10 border-b border-[var(--stroke)] bg-[var(--surface)]/85 backdrop-blur-md">
        <div className="mx-auto flex min-h-16 max-w-6xl flex-col items-start justify-between gap-3 px-4 py-3 sm:flex-row sm:items-center sm:px-6">
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-6 sm:gap-y-2">
            <Link
              href="/dashboard"
              className="font-display text-lg tracking-tight text-[var(--foreground)]"
            >
              員工中心
            </Link>
            <nav className="flex w-full flex-wrap items-center gap-1 text-sm sm:w-auto">
              <Link
                href="/dashboard"
                className="rounded-full px-3 py-1.5 text-[var(--muted)] hover:bg-[var(--elevated)] hover:text-[var(--foreground)]"
              >
                總覽
              </Link>
              <Link
                href="/dashboard/inventory"
                className="rounded-full px-3 py-1.5 text-[var(--muted)] hover:bg-[var(--elevated)] hover:text-[var(--foreground)]"
              >
                庫存
              </Link>
              <Link
                href="/dashboard/schedule"
                className="rounded-full px-3 py-1.5 text-[var(--muted)] hover:bg-[var(--elevated)] hover:text-[var(--foreground)]"
              >
                班表
              </Link>
              {isAdmin ? (
                <Link
                  href="/dashboard/review-users"
                  className="rounded-full px-3 py-1.5 text-[var(--muted)] hover:bg-[var(--elevated)] hover:text-[var(--foreground)]"
                >
                  員工審核
                </Link>
              ) : null}
            </nav>
          </div>
          <div className="flex w-full items-center justify-between gap-4 sm:w-auto sm:justify-end sm:gap-6">
            <span className="hidden text-sm text-[var(--muted)] sm:inline">
              {session.user.name}
            </span>
            <SignOutButton />
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">{children}</div>
    </div>
  );
}
