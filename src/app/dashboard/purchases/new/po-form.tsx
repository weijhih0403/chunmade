"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createPurchaseOrderAction } from "@/modules/purchasing/actions";
import { initialFormState } from "@/lib/forms";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";

type Opt = { id: string; name: string };
type ItemOpt = { id: string; name: string; cost: number };
type Line = { itemId: string; quantity: number; unitPrice: number };

export function PurchaseOrderForm({
  suppliers,
  warehouses,
  items,
}: {
  suppliers: Opt[];
  warehouses: Opt[];
  items: ItemOpt[];
}) {
  const [state, action, pending] = useActionState(createPurchaseOrderAction, initialFormState);
  const [lines, setLines] = useState<Line[]>([{ itemId: "", quantity: 1, unitPrice: 0 }]);
  const router = useRouter();

  useEffect(() => {
    if (state.ok) {
      const t = setTimeout(() => router.push("/dashboard/purchases"), 800);
      return () => clearTimeout(t);
    }
  }, [state.ok, router]);

  const total = lines.reduce((s, l) => s + l.quantity * l.unitPrice, 0);

  function updateLine(idx: number, patch: Partial<Line>) {
    setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  }
  function setItem(idx: number, itemId: string) {
    const it = items.find((x) => x.id === itemId);
    updateLine(idx, { itemId, unitPrice: it?.cost ?? 0 });
  }

  return (
    <form action={action} className="max-w-3xl space-y-4">
      <input type="hidden" name="lines" value={JSON.stringify(lines.filter((l) => l.itemId))} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <Label>供應商</Label>
          <Select name="supplierId" required defaultValue="">
            <option value="" disabled>
              請選擇
            </option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label>入庫倉庫</Label>
          <Select name="warehouseId" required defaultValue="">
            <option value="" disabled>
              請選擇
            </option>
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div>
        <Label>預計到貨日（選填）</Label>
        <Input name="expectedDate" type="date" className="w-48" />
      </div>

      <div className="rounded-lg border border-gray-200">
        <div className="grid grid-cols-12 gap-2 border-b bg-gray-50 px-3 py-2 text-xs font-medium text-gray-500">
          <div className="col-span-6">商品</div>
          <div className="col-span-2 text-right">數量</div>
          <div className="col-span-3 text-right">單價</div>
          <div className="col-span-1"></div>
        </div>
        {lines.map((line, idx) => (
          <div key={idx} className="grid grid-cols-12 items-center gap-2 px-3 py-2">
            <div className="col-span-6">
              <Select value={line.itemId} onChange={(e) => setItem(idx, e.target.value)}>
                <option value="">請選擇商品</option>
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
                type="number"
                step="0.01"
                min="0"
                value={line.unitPrice}
                onChange={(e) => updateLine(idx, { unitPrice: Number(e.target.value) })}
                className="text-right"
              />
            </div>
            <div className="col-span-1 text-center">
              <button
                type="button"
                onClick={() => setLines((prev) => prev.filter((_, i) => i !== idx))}
                className="text-red-500 hover:text-red-700"
                aria-label="移除"
              >
                ✕
              </button>
            </div>
          </div>
        ))}
        <div className="border-t px-3 py-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setLines((prev) => [...prev, { itemId: "", quantity: 1, unitPrice: 0 }])}
          >
            + 新增明細
          </Button>
        </div>
      </div>

      <div className="text-right text-lg font-semibold">
        合計：NT$ {total.toLocaleString("zh-TW", { maximumFractionDigits: 2 })}
      </div>

      <div>
        <Label>備註</Label>
        <Input name="note" />
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

      <Button type="submit" disabled={pending || lines.filter((l) => l.itemId).length === 0}>
        {pending ? "建立中…" : "建立採購單"}
      </Button>
    </form>
  );
}
