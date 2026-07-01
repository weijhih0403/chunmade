"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createRecipeAction, updateRecipeAction } from "@/modules/production/actions";
import { initialFormState } from "@/lib/forms";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { SearchableSelect } from "@/components/ui/searchable-select";

type Opt = { id: string; name: string };
type Line = { materialId: string; quantity: number; wasteRate: number };

export type RecipeDefaults = {
  id: string;
  productId: string;
  name: string;
  outputQty: string;
  lines: Line[];
};

export function RecipeForm({
  products,
  materials,
  defaults,
}: {
  products: Opt[];
  materials: Opt[];
  defaults?: RecipeDefaults;
}) {
  const isEdit = Boolean(defaults?.id);
  const [state, action, pending] = useActionState(
    isEdit ? updateRecipeAction : createRecipeAction,
    initialFormState,
  );
  const [lines, setLines] = useState<Line[]>(
    defaults?.lines?.length ? defaults.lines : [{ materialId: "", quantity: 1, wasteRate: 0 }],
  );
  const router = useRouter();

  useEffect(() => {
    if (state.ok && !isEdit) {
      const t = setTimeout(() => router.push("/dashboard/recipes"), 800);
      return () => clearTimeout(t);
    }
    if (state.ok && isEdit) {
      const t = setTimeout(() => router.push(`/dashboard/recipes/${defaults!.id}`), 800);
      return () => clearTimeout(t);
    }
  }, [state.ok, router, isEdit, defaults?.id]);

  function update(idx: number, patch: Partial<Line>) {
    setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  }

  return (
    <form action={action} className="max-w-3xl space-y-4">
      {isEdit && <input type="hidden" name="id" value={defaults!.id} />}
      <input type="hidden" name="lines" value={JSON.stringify(lines.filter((l) => l.materialId))} />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <Label>產出品項（成品 / 半成品）</Label>
          {isEdit ? (
            <>
              <input type="hidden" name="productId" value={defaults!.productId} />
              <p className="mt-1 text-sm text-gray-700">
                {products.find((p) => p.id === defaults!.productId)?.name ?? defaults!.productId}
              </p>
            </>
          ) : (
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
          )}
        </div>
        <div>
          <Label>標準產量</Label>
          <Input
            name="outputQty"
            type="number"
            step="0.0001"
            defaultValue={defaults?.outputQty ?? "1"}
            required
          />
        </div>
      </div>
      <div>
        <Label>配方名稱</Label>
        <Input name="name" required defaultValue={defaults?.name} />
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
              <SearchableSelect
                options={materials}
                defaultValue={line.materialId}
                placeholder="搜尋原料…"
                onSelect={(id) => update(idx, { materialId: id })}
              />
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
        {pending ? "儲存中…" : isEdit ? "儲存變更（新版本）" : "建立配方"}
      </Button>
    </form>
  );
}
