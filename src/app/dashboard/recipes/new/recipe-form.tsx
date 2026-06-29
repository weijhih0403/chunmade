"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createRecipeAction } from "@/modules/production/actions";
import { initialFormState } from "@/lib/forms";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";

type Opt = { id: string; name: string };
type Line = { materialId: string; quantity: number; wasteRate: number };

export function RecipeForm({ products, materials }: { products: Opt[]; materials: Opt[] }) {
  const [state, action, pending] = useActionState(createRecipeAction, initialFormState);
  const [lines, setLines] = useState<Line[]>([{ materialId: "", quantity: 1, wasteRate: 0 }]);
  const router = useRouter();

  useEffect(() => {
    if (state.ok) {
      const t = setTimeout(() => router.push("/dashboard/recipes"), 800);
      return () => clearTimeout(t);
    }
  }, [state.ok, router]);

  function update(idx: number, patch: Partial<Line>) {
    setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  }

  return (
    <form action={action} className="max-w-3xl space-y-4">
      <input type="hidden" name="lines" value={JSON.stringify(lines.filter((l) => l.materialId))} />
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>產出品項（成品 / 半成品）</Label>
          <Select name="productId" required defaultValue="">
            <option value="" disabled>
              請選擇
            </option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label>標準產量</Label>
          <Input name="outputQty" type="number" step="0.0001" defaultValue="1" required />
        </div>
      </div>
      <div>
        <Label>配方名稱</Label>
        <Input name="name" required />
      </div>

      <div className="rounded-lg border border-gray-200">
        <div className="grid grid-cols-12 gap-2 border-b bg-gray-50 px-3 py-2 text-xs font-medium text-gray-500">
          <div className="col-span-6">原料 / 半成品</div>
          <div className="col-span-3 text-right">標準用量</div>
          <div className="col-span-2 text-right">損耗率(0~1)</div>
          <div className="col-span-1"></div>
        </div>
        {lines.map((line, idx) => (
          <div key={idx} className="grid grid-cols-12 items-center gap-2 px-3 py-2">
            <div className="col-span-6">
              <Select
                value={line.materialId}
                onChange={(e) => update(idx, { materialId: e.target.value })}
              >
                <option value="">請選擇</option>
                {materials.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="col-span-3">
              <Input
                type="number"
                step="0.0001"
                value={line.quantity}
                onChange={(e) => update(idx, { quantity: Number(e.target.value) })}
                className="text-right"
              />
            </div>
            <div className="col-span-2">
              <Input
                type="number"
                step="0.01"
                value={line.wasteRate}
                onChange={(e) => update(idx, { wasteRate: Number(e.target.value) })}
                className="text-right"
              />
            </div>
            <div className="col-span-1 text-center">
              <button
                type="button"
                onClick={() => setLines((prev) => prev.filter((_, i) => i !== idx))}
                className="text-red-500 hover:text-red-700"
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
            onClick={() =>
              setLines((prev) => [...prev, { materialId: "", quantity: 1, wasteRate: 0 }])
            }
          >
            + 新增原料
          </Button>
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
        {pending ? "建立中…" : "建立配方"}
      </Button>
    </form>
  );
}
