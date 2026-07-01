"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { addDeliveryItemsAction } from "@/modules/delivery/actions";
import { initialFormState } from "@/lib/forms";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";

type ItemOpt = { id: string; name: string; unit: string };
type Line = { itemId: string; quantity: number; note: string };

export function AddDeliveryItemsForm({
  deliveryId,
  items,
}: {
  deliveryId: string;
  items: ItemOpt[];
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState(addDeliveryItemsAction, initialFormState);
  const [lines, setLines] = useState<Line[]>([{ itemId: "", quantity: 1, note: "" }]);

  useEffect(() => {
    if (state.ok) router.refresh();
  }, [state.ok, router]);

  function updateLine(idx: number, patch: Partial<Line>) {
    setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  }

  return (
    <form action={action} className="space-y-3 rounded-lg border border-gray-200 p-4">
      <input type="hidden" name="deliveryId" value={deliveryId} />
      <input
        type="hidden"
        name="lines"
        value={JSON.stringify(lines.filter((l) => l.itemId))}
      />
      <p className="text-sm font-medium text-gray-700">新增品項</p>
      {lines.map((line, idx) => (
        <div key={idx} className="grid grid-cols-1 gap-2 sm:grid-cols-12 sm:items-end">
          <div className="sm:col-span-6">
            <Label>品項</Label>
            <Select
              value={line.itemId}
              onChange={(e) => updateLine(idx, { itemId: e.target.value })}
            >
              <option value="">請選擇</option>
              {items.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="sm:col-span-2">
            <Label>數量</Label>
            <Input
              type="number"
              step="0.0001"
              min="0"
              value={line.quantity}
              onChange={(e) => updateLine(idx, { quantity: Number(e.target.value) })}
            />
          </div>
          <div className="sm:col-span-3">
            <Label>備註</Label>
            <Input
              value={line.note}
              onChange={(e) => updateLine(idx, { note: e.target.value })}
              placeholder="選填"
            />
          </div>
          <div className="sm:col-span-1">
            {lines.length > 1 && (
              <Button type="button" variant="ghost" size="sm" onClick={() => setLines((p) => p.filter((_, i) => i !== idx))}>
                刪
              </Button>
            )}
          </div>
        </div>
      ))}
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setLines((p) => [...p, { itemId: "", quantity: 1, note: "" }])}
        >
          再加一項
        </Button>
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "新增中…" : "新增品項"}
        </Button>
      </div>
      {state.message && (
        <p className={`text-sm ${state.ok ? "text-green-600" : "text-red-600"}`}>{state.message}</p>
      )}
    </form>
  );
}
