"use client";

import type {
  Employee,
  ShiftKind,
  ShiftUnavailability,
  Store,
} from "@prisma/client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Fragment, useTransition } from "react";
import type { DayAssignment } from "@/lib/schedule-engine";
import { dateKey, formatShiftNames, weekdayZh } from "@/lib/schedule-engine";
import {
  createEmployee,
  deleteEmployee,
  setShiftUnavailable,
  updateEmployeeMeta,
} from "./actions";

type BlockRow = Pick<
  ShiftUnavailability,
  "employeeId" | "date" | "shift"
>;

function blockKey(employeeId: string, date: string, shift: ShiftKind) {
  return `${employeeId}|${date}|${shift}`;
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function storeLabel(store: Store): string {
  if (store === "ASAKUSA") return "淺草";
  if (store === "TAIPEI_BAY") return "台北灣";
  return "水堆";
}

export function SchedulePlanner({
  year,
  month,
  store,
  stores,
  canEdit,
  employees,
  blocks,
  assignments,
  summaryWarnings,
}: {
  year: number;
  month: number;
  store: Store;
  stores: Store[];
  canEdit: boolean;
  employees: Employee[];
  blocks: BlockRow[];
  assignments: DayAssignment[];
  summaryWarnings: string[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const blocked = new Set(
    blocks.map((b) => blockKey(b.employeeId, b.date, b.shift)),
  );

  const dim = daysInMonth(year, month);
  const days = Array.from({ length: dim }, (_, i) => i + 1);

  const prev =
    month <= 1 ? { y: year - 1, m: 12 } : { y: year, m: month - 1 };
  const next =
    month >= 12 ? { y: year + 1, m: 1 } : { y: year, m: month + 1 };

  const exportHref = `/api/schedule/export?year=${year}&month=${month}&store=${store}`;

  return (
    <div className="space-y-10 sm:space-y-12">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="font-display text-2xl font-medium tracking-tight text-[var(--foreground)] sm:text-3xl">
            班表（{storeLabel(store)}）
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--muted)]">
            先設定員工姓名；選擇月份後，勾選各員工「不可排」的早班（10:00–17:00）或晚班（17:00–23:00）時段。系統會避開這些時段，自動排出每日早班與晚班各{" "}
            <strong className="font-medium text-[var(--foreground)]">2</strong>{" "}
            人；同人同日不會又排早班又排晚班（不排全天）。新增員工時請選「預設班次」（早／晚）與「身分」（正職／打工）；總班數相同時會優先排到預設班次。另會盡量把晚班在整月分散（早班不套用分散規則）。
            網頁無法直接開啟您電腦上的 Excel，請使用下方「下載
            Excel」取得{" "}
            <strong className="font-medium text-[var(--foreground)]">
              .xlsx
            </strong>{" "}
            再用 Excel 開啟編輯或列印。
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {stores.map((s) => (
            <Link
              key={s}
              href={`/dashboard/schedule?year=${year}&month=${month}&store=${s}`}
              className={`rounded-full border px-3 py-2 text-sm sm:px-4 ${
                s === store
                  ? "border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--foreground)]"
                  : "border-[var(--stroke)] hover:border-[var(--accent)]"
              }`}
            >
              {storeLabel(s)}
            </Link>
          ))}
          <Link
            href={`/dashboard/schedule?year=${prev.y}&month=${prev.m}&store=${store}`}
            className="rounded-full border border-[var(--stroke)] px-3 py-2 text-sm hover:border-[var(--accent)] sm:px-4"
          >
            ← 上月
          </Link>
          <span className="font-display w-full text-center text-base text-[var(--foreground)] sm:w-auto sm:text-lg">
            {year} 年 {month} 月
          </span>
          <Link
            href={`/dashboard/schedule?year=${next.y}&month=${next.m}&store=${store}`}
            className="rounded-full border border-[var(--stroke)] px-3 py-2 text-sm hover:border-[var(--accent)] sm:px-4"
          >
            下月 →
          </Link>
          <a
            href={exportHref}
            className="rounded-full bg-[var(--foreground)] px-4 py-2 text-sm font-semibold text-[var(--surface)] hover:opacity-90 sm:px-5"
          >
            下載 Excel
          </a>
        </div>
      </div>

      <section className="rounded-2xl border border-[var(--stroke)] bg-[var(--elevated)] p-4 shadow-[var(--shadow-soft)] sm:p-6">
        <h2 className="font-display text-lg text-[var(--foreground)]">
          員工名單
        </h2>
        {!canEdit ? (
          <p className="mt-2 text-sm text-[var(--muted)]">
            目前為唯讀模式：僅最高權限使用者可新增員工、修改不可排班與調整排班設定。
          </p>
        ) : null}
        <form
          action={(fd) => {
            startTransition(async () => {
              fd.set("store", store);
              await createEmployee(fd);
              router.refresh();
            });
          }}
          className="mt-4 grid gap-3 sm:flex sm:flex-wrap sm:items-end sm:gap-4"
        >
          <label className="block text-sm">
            <span className="text-[var(--muted)]">姓名</span>
            <input
              name="name"
              required
              disabled={pending || !canEdit}
              placeholder="例如：王小明"
              className="mt-1 min-w-[160px] rounded-xl border border-[var(--stroke)] bg-[var(--surface)] px-3 py-2 text-[var(--foreground)] outline-none focus:border-[var(--accent)]"
            />
          </label>
          <label className="block text-sm">
            <span className="text-[var(--muted)]">預設班次</span>
            <select
              name="preferredShift"
              defaultValue="EARLY"
              disabled={pending || !canEdit}
              className="mt-1 min-w-[140px] rounded-xl border border-[var(--stroke)] bg-[var(--surface)] px-3 py-2 text-[var(--foreground)] outline-none focus:border-[var(--accent)]"
            >
              <option value="EARLY">早班</option>
              <option value="LATE">晚班</option>
            </select>
          </label>
          <label className="block text-sm">
            <span className="text-[var(--muted)]">身分</span>
            <select
              name="employmentType"
              defaultValue="FULL_TIME"
              disabled={pending || !canEdit}
              className="mt-1 min-w-[120px] rounded-xl border border-[var(--stroke)] bg-[var(--surface)] px-3 py-2 text-[var(--foreground)] outline-none focus:border-[var(--accent)]"
            >
              <option value="FULL_TIME">正職</option>
              <option value="PART_TIME">打工</option>
            </select>
          </label>
          <button
            type="submit"
            disabled={pending || !canEdit}
            className="rounded-full bg-[var(--accent)] px-5 py-2 text-sm font-semibold text-[var(--accent-foreground)] hover:brightness-110 disabled:opacity-60"
          >
            新增員工
          </button>
        </form>

        {employees.length > 0 ? (
          <ul className="mt-6 divide-y divide-[var(--stroke)] border-t border-[var(--stroke)] pt-4">
            {employees.map((e) => (
              <li
                key={e.id}
                className="flex flex-col gap-3 border-b border-[var(--stroke)] py-4 last:border-b-0 sm:flex-row sm:items-center sm:justify-between"
              >
                <span className="min-w-[100px] font-medium text-[var(--foreground)]">
                  {e.name}
                </span>
                <div className="flex flex-wrap items-center gap-3">
                  <label className="flex items-center gap-2 text-xs text-[var(--muted)]">
                    <span className="whitespace-nowrap">預設班次</span>
                    <select
                      value={e.preferredShift}
                      disabled={pending || !canEdit}
                      onChange={(ev) =>
                        startTransition(async () => {
                          await updateEmployeeMeta(
                            e.id,
                            ev.target.value === "LATE" ? "LATE" : "EARLY",
                            e.employmentType,
                          );
                          router.refresh();
                        })
                      }
                      className="rounded-lg border border-[var(--stroke)] bg-[var(--surface)] px-2 py-1.5 text-[var(--foreground)]"
                    >
                      <option value="EARLY">早班</option>
                      <option value="LATE">晚班</option>
                    </select>
                  </label>
                  <label className="flex items-center gap-2 text-xs text-[var(--muted)]">
                    <span className="whitespace-nowrap">身分</span>
                    <select
                      value={e.employmentType}
                      disabled={pending || !canEdit}
                      onChange={(ev) =>
                        startTransition(async () => {
                          await updateEmployeeMeta(
                            e.id,
                            e.preferredShift,
                            ev.target.value === "PART_TIME"
                              ? "PART_TIME"
                              : "FULL_TIME",
                          );
                          router.refresh();
                        })
                      }
                      className="rounded-lg border border-[var(--stroke)] bg-[var(--surface)] px-2 py-1.5 text-[var(--foreground)]"
                    >
                      <option value="FULL_TIME">正職</option>
                      <option value="PART_TIME">打工</option>
                    </select>
                  </label>
                  <button
                    type="button"
                    disabled={pending || !canEdit}
                    onClick={() =>
                      startTransition(async () => {
                        await deleteEmployee(e.id);
                        router.refresh();
                      })
                    }
                    className="text-xs text-red-600 hover:underline dark:text-red-400"
                  >
                    移除
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-sm text-[var(--muted)]">
            尚未加入員工；請先新增至少一位才能排班。
          </p>
        )}
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="font-display text-lg text-[var(--foreground)]">
            不可排班時段（{year} 年 {month} 月）
          </h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            勾選表示該日<strong className="text-[var(--foreground)]">不可</strong>
            排該班次。留白代表皆可排。
          </p>
        </div>

        {employees.length === 0 ? (
          <p className="rounded-xl border border-dashed border-[var(--stroke)] px-4 py-8 text-center text-sm text-[var(--muted)]">
            請先新增員工。
          </p>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-[var(--stroke)] bg-[var(--elevated)] shadow-[var(--shadow-soft)]">
            <p className="sticky left-0 z-10 border-b border-[var(--stroke)] bg-[var(--surface)] px-3 py-2 text-xs text-[var(--muted)] sm:hidden">
              可左右滑動查看整月表格
            </p>
            <table className="min-w-max border-collapse text-xs">
              <thead>
                <tr className="border-b border-[var(--stroke)] bg-[var(--surface)]">
                  <th className="sticky left-0 z-10 min-w-[100px] border-r border-[var(--stroke)] bg-[var(--surface)] px-3 py-2 text-left font-medium text-[var(--foreground)]">
                    員工
                  </th>
                  {days.map((d) => (
                    <th
                      key={d}
                      colSpan={2}
                      className="border-r border-[var(--stroke)] px-1 py-2 text-center font-medium text-[var(--foreground)]"
                    >
                      {d} 日
                    </th>
                  ))}
                </tr>
                <tr className="border-b border-[var(--stroke)] bg-[var(--surface)]/80">
                  <th className="sticky left-0 z-10 border-r border-[var(--stroke)] bg-[var(--surface)] px-3 py-1" />
                  {days.map((d) => (
                    <Fragment key={`h-${d}`}>
                      <th className="border-r border-[var(--stroke)] px-0.5 py-1 text-[10px] font-normal text-[var(--muted)]">
                        早
                      </th>
                      <th className="border-r border-[var(--stroke)] px-0.5 py-1 text-[10px] font-normal text-[var(--muted)]">
                        晚
                      </th>
                    </Fragment>
                  ))}
                </tr>
              </thead>
              <tbody>
                {employees.map((emp) => (
                  <tr
                    key={emp.id}
                    className="border-b border-[var(--stroke)] last:border-b-0"
                  >
                    <td className="sticky left-0 z-10 border-r border-[var(--stroke)] bg-[var(--elevated)] px-3 py-2 font-medium text-[var(--foreground)]">
                      {emp.name}
                    </td>
                    {days.map((day) => {
                      const dk = dateKey(year, month, day);
                      const earlyOn = blocked.has(
                        blockKey(emp.id, dk, "EARLY"),
                      );
                      const lateOn = blocked.has(blockKey(emp.id, dk, "LATE"));
                      return (
                        <Fragment key={`${emp.id}-${dk}`}>
                          <td className="border-r border-[var(--stroke)] px-0.5 py-1 text-center align-middle">
                            <input
                              type="checkbox"
                              disabled={pending || !canEdit}
                              checked={earlyOn}
                              onChange={(e) =>
                                startTransition(async () => {
                                  await setShiftUnavailable(
                                    emp.id,
                                    dk,
                                    "EARLY",
                                    e.target.checked,
                                  );
                                  router.refresh();
                                })
                              }
                              aria-label={`${emp.name} ${dk} 不可早班`}
                              className="h-3.5 w-3.5 accent-[var(--accent)]"
                            />
                          </td>
                          <td className="border-r border-[var(--stroke)] px-0.5 py-1 text-center align-middle">
                            <input
                              type="checkbox"
                              disabled={pending || !canEdit}
                              checked={lateOn}
                              onChange={(e) =>
                                startTransition(async () => {
                                  await setShiftUnavailable(
                                    emp.id,
                                    dk,
                                    "LATE",
                                    e.target.checked,
                                  );
                                  router.refresh();
                                })
                              }
                              aria-label={`${emp.name} ${dk} 不可晚班`}
                              className="h-3.5 w-3.5 accent-[var(--accent)]"
                            />
                          </td>
                        </Fragment>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-lg text-[var(--foreground)]">
          自動排班結果
        </h2>
        {summaryWarnings.length > 0 ? (
          <div className="rounded-xl border border-amber-500/35 bg-amber-500/10 px-4 py-3 text-sm text-amber-950 dark:text-amber-100">
            <p className="font-medium">有部分日期無法排到人力：</p>
            <ul className="mt-2 list-inside list-disc space-y-1 opacity-90">
              {summaryWarnings.slice(0, 12).map((w) => (
                <li key={w}>{w}</li>
              ))}
              {summaryWarnings.length > 12 ? (
                <li>…其餘 {summaryWarnings.length - 12} 筆請見 Excel「排班摘要」工作表</li>
              ) : null}
            </ul>
          </div>
        ) : employees.length > 0 ? (
          <p className="text-sm text-[var(--muted)]">
            本月每日皆可排出早班與晚班各 2 人（在現有員工與限制下）。
          </p>
        ) : null}

        <div className="overflow-x-auto rounded-2xl border border-[var(--stroke)] bg-[var(--elevated)] shadow-[var(--shadow-soft)]">
          <table className="w-full min-w-[520px] text-sm">
            <thead className="border-b border-[var(--stroke)] bg-[var(--surface)] text-[var(--muted)]">
              <tr>
                <th className="px-4 py-3 text-left font-medium">日期</th>
                <th className="px-4 py-3 text-left font-medium">
                  早班（10:00–17:00）·2 人
                </th>
                <th className="px-4 py-3 text-left font-medium">
                  晚班（17:00–23:00）·2 人
                </th>
                <th className="px-4 py-3 text-left font-medium">備註</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--stroke)]">
              {assignments.map((a: DayAssignment) => (
                <tr key={a.date}>
                  <td className="px-4 py-3 whitespace-nowrap text-[var(--foreground)]">
                    {a.date}
                  </td>
                  <td className="px-4 py-3 text-[var(--foreground)]">
                    {formatShiftNames(a.earlyStaff)}
                  </td>
                  <td className="px-4 py-3 text-[var(--foreground)]">
                    {formatShiftNames(a.lateStaff)}
                  </td>
                  <td className="px-4 py-3 text-xs text-amber-800 dark:text-amber-200">
                    {a.warnings.join("；") || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-lg text-[var(--foreground)]">
            Excel 預覽（目前排班）
          </h2>
          <span className="text-xs text-[var(--muted)]">
            此欄位內容與下載的 Excel 排班明細一致
          </span>
        </div>
        <div className="overflow-x-auto rounded-2xl border border-[var(--stroke)] bg-[var(--elevated)] shadow-[var(--shadow-soft)]">
          <table className="w-full min-w-[620px] text-sm">
            <thead className="border-b border-[var(--stroke)] bg-[var(--surface)] text-[var(--muted)]">
              <tr>
                <th className="px-4 py-3 text-left font-medium">日期</th>
                <th className="px-4 py-3 text-left font-medium">星期</th>
                <th className="px-4 py-3 text-left font-medium">
                  早班（2人，10:00–17:00）
                </th>
                <th className="px-4 py-3 text-left font-medium">
                  晚班（2人，17:00–23:00）
                </th>
                <th className="px-4 py-3 text-left font-medium">備註</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--stroke)]">
              {assignments.map((a: DayAssignment) => (
                <tr key={`excel-${a.date}`}>
                  <td className="px-4 py-3 whitespace-nowrap text-[var(--foreground)]">
                    {a.date}
                  </td>
                  <td className="px-4 py-3 text-[var(--foreground)]">
                    週{weekdayZh(a.date)}
                  </td>
                  <td className="px-4 py-3 text-[var(--foreground)]">
                    {formatShiftNames(a.earlyStaff)}
                  </td>
                  <td className="px-4 py-3 text-[var(--foreground)]">
                    {formatShiftNames(a.lateStaff)}
                  </td>
                  <td className="px-4 py-3 text-xs text-amber-800 dark:text-amber-200">
                    {a.warnings.join("；") || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
