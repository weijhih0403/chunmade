import Link from "next/link";
import { SiteNav } from "@/components/site-nav";

export default function Home() {
  return (
    <>
      <SiteNav />

      <main className="flex flex-1 flex-col pt-[72px]">
        <section className="relative overflow-hidden px-6 pb-24 pt-16 sm:pb-32 sm:pt-24">
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.55]"
            aria-hidden
            style={{
              backgroundImage: `
                radial-gradient(ellipse 100% 80% at 50% -20%, var(--glow-1), transparent 55%),
                radial-gradient(ellipse 60% 50% at 100% 50%, var(--glow-2), transparent 45%)
              `,
            }}
          />
          <div className="grain pointer-events-none absolute inset-0 opacity-[0.06]" />

          <div className="relative mx-auto max-w-6xl">
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-[var(--accent)]">
              Handcrafted in Taiwan
            </p>
            <h1 className="mt-6 font-display text-5xl font-medium leading-[1.08] tracking-tight text-[var(--foreground)] sm:text-6xl lg:text-7xl">
              把時間，
              <br />
              織進每一件作品裡
            </h1>
            <p className="mt-8 max-w-xl text-lg leading-relaxed text-[var(--muted)]">
              淳手作相信慢工與細節—陶釉的厚度、布料的落點、木工的紋理，都值得被好好對待。加入會員，收藏你的手感旅程。
            </p>
            <div className="mt-12 flex flex-wrap gap-4">
              <Link
                href="/login"
                className="inline-flex items-center justify-center rounded-full bg-[var(--accent)] px-8 py-3.5 text-sm font-semibold text-[var(--accent-foreground)] shadow-[0_0_32px_var(--accent-glow)] transition hover:brightness-110"
              >
                員工登入
              </Link>
              <a
                href="#story"
                className="inline-flex items-center justify-center rounded-full border border-[var(--stroke)] bg-[var(--elevated)] px-8 py-3.5 text-sm font-medium text-[var(--foreground)] transition hover:border-[var(--accent)]"
              >
                認識品牌
              </a>
            </div>
          </div>
        </section>

        <section
          id="story"
          className="border-y border-[var(--stroke)] bg-[var(--elevated)] px-6 py-24"
        >
          <div className="mx-auto grid max-w-6xl gap-16 lg:grid-cols-2 lg:gap-24 lg:items-center">
            <div>
              <h2 className="font-display text-3xl font-medium tracking-tight text-[var(--foreground)] sm:text-4xl">
                手感不是口號，
                <br />
                是每一次取捨
              </h2>
              <p className="mt-6 text-base leading-relaxed text-[var(--muted)]">
                我們以小型工坊為單位，限量製作生活器皿與織品。材料來源透明，工序可視—你拿到的不是流水編號，而是某位師傅午後完成的那一件。
              </p>
            </div>
            <div className="grid gap-6 sm:grid-cols-2">
              {[
                {
                  title: "材料嚴選",
                  desc: "天然纖維、在地陶土與環保塗料，減少不必要添加。",
                },
                {
                  title: "限量製作",
                  desc: "每批次皆有編號與製作紀錄，可追溯來龍去脈。",
                },
                {
                  title: "友善包裝",
                  desc: "可回收紙材與緩衝，送到你手上仍然優雅。",
                },
                {
                  title: "會員禮遇",
                  desc: "登入後可享有後續活動與會員專屬內容（示意）。",
                },
              ].map((item) => (
                <article
                  key={item.title}
                  className="rounded-2xl border border-[var(--stroke)] bg-[var(--surface)] p-6 shadow-[var(--shadow-soft)]"
                >
                  <h3 className="font-display text-lg text-[var(--foreground)]">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
                    {item.desc}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="px-6 py-24">
          <div className="mx-auto max-w-6xl rounded-[2rem] border border-[var(--stroke)] bg-gradient-to-br from-[var(--elevated)] to-[var(--surface)] p-10 shadow-[var(--shadow-soft)] sm:p-14 lg:p-16">
            <div className="flex flex-col gap-10 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="font-display text-2xl font-medium text-[var(--foreground)] sm:text-3xl">
                  準備好開始了嗎？
                </h2>
                <p className="mt-4 max-w-lg text-[var(--muted)]">
                  登入後即可進入會員中心。
                </p>
              </div>
              <Link
                href="/login"
                className="inline-flex shrink-0 items-center justify-center rounded-full bg-[var(--foreground)] px-10 py-4 text-sm font-semibold text-[var(--surface)] transition hover:opacity-90"
              >
                前往登入
              </Link>
            </div>
          </div>
        </section>

        <footer className="mt-auto border-t border-[var(--stroke)] px-6 py-10">
          <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 text-sm text-[var(--muted)] sm:flex-row">
            <span className="font-display text-[var(--foreground)]">淳手作</span>
            <span>© {new Date().getFullYear()} 淳手作 · 示意網站</span>
          </div>
        </footer>
      </main>
    </>
  );
}
