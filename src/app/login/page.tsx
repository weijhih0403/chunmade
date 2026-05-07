import Link from "next/link";
import { Suspense } from "react";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[var(--surface-deep)]">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        aria-hidden
        style={{
          backgroundImage: `
            radial-gradient(ellipse 80% 50% at 20% 40%, var(--glow-1), transparent),
            radial-gradient(ellipse 60% 40% at 80% 60%, var(--glow-2), transparent)
          `,
        }}
      />
      <div className="grain pointer-events-none absolute inset-0 opacity-[0.12]" />

      <div className="relative mx-auto flex min-h-screen max-w-6xl flex-col justify-center px-6 py-16 lg:flex-row lg:items-center lg:gap-16">
        <div className="mb-12 lg:mb-0 lg:flex-1">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-[var(--muted)] transition hover:text-[var(--accent)]"
          >
            ← 返回首頁
          </Link>
          <p className="mt-10 font-display text-4xl font-medium leading-tight tracking-tight text-[var(--cream)] sm:text-5xl">
            淳手作
            <span className="block mt-2 text-2xl font-normal text-[var(--muted)] sm:text-3xl">
              員工登入
            </span>
          </p>
          <p className="mt-6 max-w-md text-base leading-relaxed text-[var(--muted)]">
            請輸入您的帳號與密碼。
          </p>
          <p className="mt-3 text-sm text-[var(--muted)]">
            尚未有帳號？{" "}
            <Link href="/apply" className="text-[var(--accent)] hover:underline">
              申請員工帳號
            </Link>
          </p>
        </div>

        <div className="w-full lg:max-w-md lg:flex-shrink-0">
          <div className="rounded-3xl border border-[var(--stroke)] bg-[var(--elevated)]/90 p-8 shadow-[var(--shadow-card)] backdrop-blur-xl">
            <Suspense fallback={<LoginFormSkeleton />}>
              <LoginForm />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  );
}

function LoginFormSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-10 rounded-lg bg-[var(--stroke)]" />
      <div className="h-10 rounded-lg bg-[var(--stroke)]" />
      <div className="h-11 rounded-full bg-[var(--stroke)]" />
    </div>
  );
}
