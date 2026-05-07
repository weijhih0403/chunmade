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
              HANDMADE DESSERTS IN TAMSUI
            </p>
            <h1 className="mt-6 font-display text-5xl font-medium leading-[1.08] tracking-tight text-[var(--foreground)] sm:text-6xl lg:text-7xl">
              把古早味，
              <br />
              揉進每一顆湯圓裡
            </h1>
            <p className="mt-8 max-w-xl text-lg leading-relaxed text-[var(--muted)]">
              淳手作從淡水出發，堅持以手工製作湯圓、米苔目、粉粿與多款甜品配料。從紅豆湯、燒仙草到豆花與黑糖剉冰，每一碗都保留傳統甜品的樸實香氣，也盛著慢慢熬煮出的溫暖滋味。
            </p>
            <div className="mt-12 flex flex-wrap gap-4">
              <Link
                href="#menu"
                className="inline-flex items-center justify-center rounded-full bg-[var(--accent)] px-8 py-3.5 text-sm font-semibold text-[var(--accent-foreground)] shadow-[0_0_32px_var(--accent-glow)] transition hover:brightness-110"
              >
                查看菜單
              </Link>
              <a
                href="#story"
                className="inline-flex items-center justify-center rounded-full border border-[var(--stroke)] bg-[var(--elevated)] px-8 py-3.5 text-sm font-medium text-[var(--foreground)] transition hover:border-[var(--accent)]"
              >
                認識淳手作
              </a>
            </div>
          </div>
        </section>

        <section id="menu" className="px-6 py-24">
          <div className="mx-auto max-w-6xl space-y-8">
            <div>
              <h2 className="font-display text-3xl font-medium tracking-tight text-[var(--foreground)] sm:text-4xl">
                人氣菜單
              </h2>
              <p className="mt-3 text-base text-[var(--muted)]">
                以下為店內常態供應品項，實際口味與配料以門市當日公告為準。
              </p>
            </div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[
                {
                  title: "嫩仙草系列",
                  desc: "滑嫩仙草搭配手工配料，口感清爽、甜度剛好。",
                  items: ["嫩仙草冰", "嫩仙草凍", "仙草綜合配料", "仙草鮮奶"],
                },
                {
                  title: "手工豆花系列",
                  desc: "每日新鮮製作豆花，搭配糖水與配料更有層次。",
                  items: ["傳統豆花", "黑糖豆花", "花生豆花", "紅豆豆花"],
                },
                {
                  title: "黑糖剉冰系列",
                  desc: "黑糖香氣濃郁，搭配芋圓、粉粿、紅豆等經典配料。",
                  items: ["黑糖剉冰", "芋圓粉粿冰", "紅豆粉粿冰", "綜合配料剉冰"],
                },
                {
                  title: "紅豆湯系列",
                  desc: "慢火熬煮紅豆，保留豆香與綿密口感。",
                  items: ["紅豆湯", "紅豆湯圓", "紅豆芋圓", "紅豆粉粿"],
                },
                {
                  title: "燒仙草系列",
                  desc: "暖心甜湯首選，冷天熱賣、四季都適合。",
                  items: ["燒仙草", "燒仙草湯圓", "燒仙草芋圓", "燒仙草綜合配料"],
                },
                {
                  title: "手工配料加購",
                  desc: "湯圓、芋圓、米苔目、粉粿等可自由搭配。",
                  items: ["湯圓", "芋圓", "米苔目", "粉粿", "紅豆", "花生"],
                },
              ].map((item) => (
                <details
                  key={item.title}
                  className="group rounded-2xl border border-[var(--stroke)] bg-[var(--elevated)] p-6 shadow-[var(--shadow-soft)] open:border-[var(--accent)]"
                >
                  <summary className="cursor-pointer list-none">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="font-display text-lg text-[var(--foreground)]">
                        {item.title}
                      </h3>
                      <span className="text-xs text-[var(--muted)] transition group-open:rotate-45">
                        ＋
                      </span>
                    </div>
                  </summary>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
                    {item.desc}
                  </p>
                  <ul className="mt-3 list-inside list-disc space-y-1 text-sm text-[var(--foreground)]/90">
                    {item.items.map((dish) => (
                      <li key={dish}>{dish}</li>
                    ))}
                  </ul>
                </details>
              ))}
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
                手作不是口號，
                <br />
                是每一碗甜品的用心
              </h2>
              <p className="mt-6 text-base leading-relaxed text-[var(--muted)]">
                我們從淡水出發，堅持以手工製作湯圓、芋圓、粉粿與多款甜品配料。從紅豆湯、燒仙草、豆花到黑糖剉冰，每一碗都用時間熬煮出古早味的溫度。
              </p>
            </div>
            <div className="grid gap-6 sm:grid-cols-2">
              {[
                {
                  title: "材料嚴選",
                  desc: "天然食材、在地食材與每日新鮮備料，減少不必要添加。",
                },
                {
                  title: "限量製作",
                  desc: "每批次皆有當日製作紀錄，口感與品質維持最佳狀態。",
                },
                {
                  title: "友善包裝",
                  desc: "可回收紙材與餐具，送到你手上仍保有風味與溫度。",
                },
                {
                  title: "品牌堅持",
                  desc: "從熬煮火候到配料比例，堅持每一口都吃得到手作用心。",
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
            <span className="font-display text-[var(--foreground)]">
              淳手作/淺草｜純手工甜品店
            </span>
            <span>
              © {new Date().getFullYear()} 淳手作/淺草｜純手工甜品店 · 示意網站
            </span>
          </div>
        </footer>
      </main>
    </>
  );
}
