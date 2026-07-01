"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createDeliveryNoteAction } from "@/modules/delivery/actions";
import { initialFormState } from "@/lib/forms";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { formatDate } from "@/lib/dates";

type Opt = { id: string; name: string };
type ItemOpt = { id: string; name: string; unit: string };
type Line = { itemId: string; quantity: number; note: string };

export function DeliveryNoteForm({
  stores,
  items,
  defaultDate,
  defaultStoreId,
}: {
  stores: Opt[];
  items: ItemOpt[];
  defaultDate: string;
  defaultStoreId?: string;
}) {
  const [state, action, pending] = useActionState(createDeliveryNoteAction, initialFormState);
  const [lines, setLines] = useState<Line[]>([{ itemId: "", quantity: 1, note: "" }]);
  const router = useRouter();

  useEffect(() => {
    if (state.ok) {
      const t = setTimeout(() => router.push("/dashboard/deliveries"), 800);
      return () => clearTimeout(t);
    }
  }, [state.ok, router]);

  function updateLine(idx: number, patch: Partial<Line>) {
    setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  }

  return (
    <form action={action} className="max-w-3xl space-y-4">
      <input type="hidden" name="lines" value={JSON.stringify(lines.filter((l) => l.itemId))} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <Label>門市</Label>
          <Select name="storeId" required defaultValue={defaultStoreId ?? ""}>
            <option value="" disabled>
              請選擇門市
            </option>
            {stores.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label>送貨日期</Label>
          <Input name="deliveryDate" type="date" defaultValue={defaultDate} />
          <p className="mt-1 text-xs text-gray-400">預設為今日（{formatDate(new Date(defaultDate))}）</p>
        </div>
      </div>

      <div>
        <Label>備註（選填）</Label>
        <Input name="note" placeholder="例如：早班配送" />
      </div>

      <div className="rounded-lg border border-gray-200">
        <div className="grid grid-cols-12 gap-2 border-b bg-gray-50 px-3 py-2 text-xs font-medium text-gray-500">
          <div className="col-span-6">品項</div>
          <div className="col-span-2 text-right">數量</div>
          <div className="col-span-3">備註</div>
          <div className="col-span-1"></div>
        </div>
        {lines.map((line, idx) => (
          <div key={idx} className="grid grid-cols-12 items-center gap-2 px-3 py-2">
            <div className="col-span-6">
              <Select
                value={line.itemId}
                onChange={(e) => updateLine(idx, { itemId: e.target.value })}
              >
                <option value="">請選擇品項</option>
                {items.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="col-span-2">
              <Input
                type="number"
                step="0.0001"
                min="0"
                value={line.quantity}
                onChange={(e) => updateLine(idx, { quantity: Number(e.target.value) })}
                className="text-right"
              />
            </div>
            <div className="col-span-3">
              <Input
                value={line.note}
                onChange={(e) => updateLine(idx, { note: e.target.value })}
                placeholder="選填"
              />
            </div>
            <div className="col-span-1 text-center">
              {lines.length > 1 && (
                <button
                  type="button"
                  className="text-xs text-red-600 hover:underline"
                  onClick={() => setLines((p) => p.filter((_, i) => i !== idx))}
                >
                  刪
                </button>
              )}
            </div>
          </div>
        ))}
        <div className="border-t px-3 py-2">
          <button
            type="button"
            className="text-sm text-amber-700 hover:underline"
            onClick={() => setLines((p) => [...p, { itemId: "", quantity: 1, note: "" }])}
          >
            + 再加一項
          </button>
        </div>
      </div>

      {state.message && (
        <p
          className={`rounded-lg px-3 py-2 text-sm ${
            state.ok ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
          }`}
        >
          {state.message}
        </p>
      )}

      <Button type="submit" disabled={pending}>
        {pending ? "建立中…" : "建立送貨單"}
      </Button>
    </form>
  );
}
