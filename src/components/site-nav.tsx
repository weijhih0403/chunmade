import { auth } from "@/auth";
import Link from "next/link";

export async function SiteNav() {
  const session = await auth();

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-transparent bg-[var(--surface)]/75 backdrop-blur-lg transition-colors duration-300 supports-[backdrop-filter]:bg-[var(--surface)]/65">
      <nav className="mx-auto flex h-[72px] max-w-6xl items-center justify-between px-6">
        <Link
          href="/"
          className="font-display text-xl tracking-tight text-[var(--foreground)]"
        >
          淳手作
        </Link>
        <div className="flex items-center gap-4">
          {session?.user ? (
            <>
              <span className="hidden text-sm text-[var(--muted)] sm:inline">
                Hi，{session.user.name}
              </span>
              <Link
                href="/dashboard"
                className="rounded-full bg-[var(--accent)] px-5 py-2 text-sm font-semibold text-[var(--accent-foreground)] shadow-[0_0_20px_var(--accent-glow)] transition hover:brightness-110"
              >
                會員中心
              </Link>
            </>
          ) : (
            <Link
              href="/login"
              className="rounded-full border border-[var(--stroke)] bg-[var(--elevated)] px-5 py-2 text-sm font-medium text-[var(--foreground)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
            >
              登入
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
}
