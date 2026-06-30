"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { FormState } from "@/lib/forms";
import { initialFormState } from "@/lib/forms";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { ITEM_TYPE_LABELS } from "@/lib/constants";

type Option = { id: string; name: string };

export type ItemDefaults = {
  id?: string;
  sku?: string;
  barcode?: string | null;
  name?: string;
  type?: string;
  categoryId?: string | null;
  baseUnitId?: string;
  price?: string;
  standardCost?: string;
  safetyStock?: string;
  reorderPoint?: string;
  shelfLifeDays?: number | null;
  trackStock?: boolean;
};

type Action = (prev: FormState, formData: FormData) => Promise<FormState>;

export function ItemForm({
  categories,
  units,
  action,
  defaults,
  submitLabel = "建立商品",
}: {
  categories: Option[];
  units: Option[];
  action: Action;
  defaults?: ItemDefaults;
  submitLabel?: string;
}) {
  const [state, formAction, pending] = useActionState(action, initialFormState);
  const router = useRouter();
  const isEdit = Boolean(defaults?.id);

  useEffect(() => {
    if (state.ok) {
      const t = setTimeout(() => router.push("/dashboard/items"), 800);
      return () => clearTimeout(t);
    }
  }, [state.ok, router]);

  const err = (f: string) => state.fieldErrors?.[f]?.[0];

  return (
    <form action={formAction} className="max-w-2xl space-y-4">
      {defaults?.id && <input type="hidden" name="id" value={defaults.id} />}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="sku">SKU</Label>
          <Input id="sku" name="sku" required defaultValue={defaults?.sku} readOnly={isEdit} />
          {isEdit && <p className="mt-1 text-xs text-gray-400">SKU 建立後不可修改</p>}
          {err("sku") && <p className="mt-1 text-xs text-red-600">{err("sku")}</p>}
        </div>
        <div>
          <Label htmlFor="barcode">條碼（選填）</Label>
          <Input id="barcode" name="barcode" defaultValue={defaults?.barcode ?? ""} />
        </div>
      </div>

      <div>
        <Label htmlFor="name">名稱</Label>
        <Input id="name" name="name" required defaultValue={defaults?.name} />
        {err("name") && <p className="mt-1 text-xs text-red-600">{err("name")}</p>}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <Label htmlFor="type">品項類型</Label>
          <Select id="type" name="type" defaultValue={defaults?.type ?? "SALE_ITEM"}>
            {Object.entries(ITEM_TYPE_LABELS).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="categoryId">分類</Label>
          <Select id="categoryId" name="categoryId" defaultValue={defaults?.categoryId ?? ""}>
            <option value="">（無）</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="baseUnitId">基本單位</Label>
          <Select
            id="baseUnitId"
            name="baseUnitId"
            required
            defaultValue={defaults?.baseUnitId ?? ""}
          >
            <option value="" disabled>
              請選擇
            </option>
            {units.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </Select>
          {err("baseUnitId") && <p className="mt-1 text-xs text-red-600">{err("baseUnitId")}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="price">售價</Label>
          <Input
            id="price"
            name="price"
            type="number"
            step="0.01"
            defaultValue={defaults?.price ?? "0"}
          />
        </div>
        <div>
          <Label htmlFor="standardCost">標準成本</Label>
          <Input
            id="standardCost"
            name="standardCost"
            type="number"
            step="0.01"
            defaultValue={defaults?.standardCost ?? "0"}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <Label htmlFor="safetyStock">安全庫存量</Label>
          <Input
            id="safetyStock"
            name="safetyStock"
            type="number"
            step="0.0001"
            defaultValue={defaults?.safetyStock ?? "0"}
          />
        </div>
        <div>
          <Label htmlFor="reorderPoint">補貨點</Label>
          <Input
            id="reorderPoint"
            name="reorderPoint"
            type="number"
            step="0.0001"
            defaultValue={defaults?.reorderPoint ?? "0"}
          />
        </div>
        <div>
          <Label htmlFor="shelfLifeDays">保存天數（選填）</Label>
          <Input
            id="shelfLifeDays"
            name="shelfLifeDays"
            type="number"
            defaultValue={defaults?.shelfLifeDays ?? ""}
          />
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm text-gray-700">
        <input
          type="checkbox"
          name="trackStock"
          defaultChecked={defaults?.trackStock ?? true}
          className="h-4 w-4"
        />
        管理庫存
      </label>

      {state.message && (
        <p
          className={`rounded-lg px-3 py-2 text-sm ${
            state.ok ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
          }`}
        >
          {state.message}
        </p>
      )}

      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "儲存中…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}
