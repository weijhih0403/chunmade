"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toggleDeliveryItemAction } from "@/modules/delivery/actions";
import { cn } from "@/lib/utils";

export type ChecklistLine = {
  id: string;
  name: string;
  quantity: string;
  unit: string;
  note: string | null;
  isDelivered: boolean;
};

export function DeliveryChecklist({
  lines,
  canToggle,
}: {
  lines: ChecklistLine[];
  canToggle: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [local, setLocal] = useState<Record<string, boolean>>(
    Object.fromEntries(lines.map((l) => [l.id, l.isDelivered])),
  );

  function handleToggle(lineId: string) {
    if (!canToggle || pending) return;
    const prev = local[lineId];
    setLocal((s) => ({ ...s, [lineId]: !prev }));
    startTransition(async () => {
      try {
        await toggleDeliveryItemAction(lineId);
        router.refresh();
      } catch {
        setLocal((s) => ({ ...s, [lineId]: prev ?? false }));
      }
    });
  }

  if (lines.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-gray-200 px-4 py-8 text-center text-sm text-gray-500">
        昨日盤點無叫貨項目，或送貨單尚未產生。
      </p>
    );
  }

  const sorted = [...lines].sort((a, b) => {
    const ad = local[a.id] ?? a.isDelivered;
    const bd = local[b.id] ?? b.isDelivered;
    if (ad === bd) return 0;
    return ad ? 1 : -1;
  });

  return (
    <ul className="space-y-2">
      {sorted.map((line) => {
        const delivered = local[line.id] ?? line.isDelivered;
        return (
          <li key={line.id}>
            <button
              type="button"
              disabled={!canToggle || pending}
              onClick={() => handleToggle(line.id)}
              className={cn(
                "flex w-full items-center justify-between gap-3 rounded-xl border px-4 py-4 text-left transition",
                delivered
                  ? "border-gray-900 bg-gray-900 text-white"
                  : "border-gray-200 bg-white text-gray-900 hover:border-gray-300 hover:bg-gray-50",
                canToggle && !pending && "active:scale-[0.99]",
                (!canToggle || pending) && "cursor-default",
              )}
            >
              <div className="min-w-0 flex-1">
                <p className="font-medium">{line.name}</p>
                <p
                  className={cn(
                    "mt-0.5 text-sm",
                    delivered ? "text-gray-300" : "text-gray-500",
                  )}
                >
                  數量 {line.quantity} {line.unit}
                  {line.note ? ` · ${line.note}` : ""}
                </p>
              </div>
              <span
                className={cn(
                  "shrink-0 rounded-full px-2.5 py-1 text-xs font-medium",
                  delivered ? "bg-white/20 text-white" : "bg-gray-100 text-gray-600",
                )}
              >
                {delivered ? "已送" : "未送"}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
