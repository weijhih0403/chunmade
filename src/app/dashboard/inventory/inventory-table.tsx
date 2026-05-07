"use client";

import type { InventoryItem } from "@prisma/client";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import {
  createInventoryItem,
  deleteInventoryItem,
  updateInventoryItem,
} from "./actions";

export function InventoryTable({ items }: { items: InventoryItem[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <div className="space-y-8">
      <form
        action={(fd) => {
          startTransition(async () => {
            await createInventoryItem(fd);
            router.refresh();
          });
        }}
        className="rounded-2xl border border-[var(--stroke)] bg-[var(--elevated)] p-6 shadow-[var(--shadow-soft)]"
      >
        <h2 className="font-display text-lg text-[var(--foreground)]">
          新增品項
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="block text-sm">
            <span className="text-[var(--muted)]">名稱</span>
            <input
              name="name"
              required
              disabled={pending}
              className="mt-1 w-full rounded-xl border border-[var(--stroke)] bg-[var(--surface)] px-3 py-2 text-[var(--foreground)] outline-none focus:border-[var(--accent)]"
            />
          </label>
          <label className="block text-sm">
            <span className="text-[var(--muted)]">數量</span>
            <input
              name="quantity"
              type="number"
              min={0}
              defaultValue={0}
              disabled={pending}
              className="mt-1 w-full rounded-xl border border-[var(--stroke)] bg-[var(--surface)] px-3 py-2 text-[var(--foreground)] outline-none focus:border-[var(--accent)]"
            />
          </label>
          <label className="block text-sm">
            <span className="text-[var(--muted)]">單位</span>
            <input
              name="unit"
              defaultValue="件"
              disabled={pending}
              className="mt-1 w-full rounded-xl border border-[var(--stroke)] bg-[var(--surface)] px-3 py-2 text-[var(--foreground)] outline-none focus:border-[var(--accent)]"
            />
          </label>
          <label className="block text-sm sm:col-span-2 lg:col-span-1">
            <span className="text-[var(--muted)]">備註</span>
            <input
              name="notes"
              disabled={pending}
              className="mt-1 w-full rounded-xl border border-[var(--stroke)] bg-[var(--surface)] px-3 py-2 text-[var(--foreground)] outline-none focus:border-[var(--accent)]"
            />
          </label>
        </div>
        <button
          type="submit"
          disabled={pending}
          className="mt-6 rounded-full bg-[var(--accent)] px-6 py-2.5 text-sm font-semibold text-[var(--accent-foreground)] hover:brightness-110 disabled:opacity-60"
        >
          {pending ? "新增中…" : "新增"}
        </button>
      </form>

      <div className="overflow-x-auto rounded-2xl border border-[var(--stroke)] bg-[var(--elevated)] shadow-[var(--shadow-soft)]">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-[var(--stroke)] bg-[var(--surface)]">
            <tr className="text-[var(--muted)]">
              <th className="px-4 py-3 font-medium">品項</th>
              <th className="px-4 py-3 font-medium">數量</th>
              <th className="px-4 py-3 font-medium">單位</th>
              <th className="px-4 py-3 font-medium">備註</th>
              <th className="px-4 py-3 font-medium">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--stroke)]">
            {items.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-12 text-center text-[var(--muted)]"
                >
                  尚無品項，請於上方新增。
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.id} className="align-top">
                  <td className="px-4 py-3" colSpan={5}>
                    <form
                      className="grid gap-3 sm:grid-cols-[2fr_1fr_1fr_2fr_auto] sm:items-end"
                      action={(fd) => {
                        startTransition(async () => {
                          await updateInventoryItem(item.id, fd);
                          router.refresh();
                        });
                      }}
                    >
                      <label className="block text-xs">
                        <span className="text-[var(--muted)]">名稱</span>
                        <input
                          name="name"
                          required
                          defaultValue={item.name}
                          disabled={pending}
                          className="mt-1 w-full rounded-lg border border-[var(--stroke)] bg-[var(--surface)] px-2 py-2 text-[var(--foreground)] outline-none focus:border-[var(--accent)]"
                        />
                      </label>
                      <label className="block text-xs">
                        <span className="text-[var(--muted)]">數量</span>
                        <input
                          name="quantity"
                          type="number"
                          min={0}
                          defaultValue={item.quantity}
                          disabled={pending}
                          className="mt-1 w-full rounded-lg border border-[var(--stroke)] bg-[var(--surface)] px-2 py-2 text-[var(--foreground)] outline-none focus:border-[var(--accent)]"
                        />
                      </label>
                      <label className="block text-xs">
                        <span className="text-[var(--muted)]">單位</span>
                        <input
                          name="unit"
                          defaultValue={item.unit}
                          disabled={pending}
                          className="mt-1 w-full rounded-lg border border-[var(--stroke)] bg-[var(--surface)] px-2 py-2 text-[var(--foreground)] outline-none focus:border-[var(--accent)]"
                        />
                      </label>
                      <label className="block text-xs">
                        <span className="text-[var(--muted)]">備註</span>
                        <input
                          name="notes"
                          defaultValue={item.notes}
                          disabled={pending}
                          className="mt-1 w-full rounded-lg border border-[var(--stroke)] bg-[var(--surface)] px-2 py-2 text-[var(--foreground)] outline-none focus:border-[var(--accent)]"
                        />
                      </label>
                      <div className="flex flex-wrap gap-2 pb-0.5">
                        <button
                          type="submit"
                          disabled={pending}
                          className="rounded-full border border-[var(--stroke)] px-4 py-2 text-xs font-medium hover:border-[var(--accent)]"
                        >
                          儲存
                        </button>
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() =>
                            startTransition(async () => {
                              await deleteInventoryItem(item.id);
                              router.refresh();
                            })
                          }
                          className="rounded-full border border-red-500/40 px-4 py-2 text-xs font-medium text-red-600 hover:bg-red-500/10 dark:text-red-400"
                        >
                          刪除
                        </button>
                      </div>
                    </form>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
