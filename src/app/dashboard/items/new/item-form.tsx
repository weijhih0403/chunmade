"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { createItemAction } from "@/modules/catalog/actions";
import { initialFormState } from "@/lib/forms";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { ITEM_TYPE_LABELS } from "@/lib/constants";

type Option = { id: string; name: string };

export function ItemForm({
  categories,
  units,
}: {
  categories: Option[];
  units: Option[];
}) {
  const [state, action, pending] = useActionState(createItemAction, initialFormState);
  const router = useRouter();

  useEffect(() => {
    if (state.ok) {
      const t = setTimeout(() => router.push("/dashboard/items"), 800);
      return () => clearTimeout(t);
    }
  }, [state.ok, router]);

  const err = (f: string) => state.fieldErrors?.[f]?.[0];

  return (
    <form action={action} className="max-w-2xl space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="sku">SKU</Label>
          <Input id="sku" name="sku" required />
          {err("sku") && <p className="mt-1 text-xs text-red-600">{err("sku")}</p>}
        </div>
        <div>
          <Label htmlFor="barcode">條碼（選填）</Label>
          <Input id="barcode" name="barcode" />
        </div>
      </div>

      <div>
        <Label htmlFor="name">名稱</Label>
        <Input id="name" name="name" required />
        {err("name") && <p className="mt-1 text-xs text-red-600">{err("name")}</p>}
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <Label htmlFor="type">品項類型</Label>
          <Select id="type" name="type" defaultValue="SALE_ITEM">
            {Object.entries(ITEM_TYPE_LABELS).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="categoryId">分類</Label>
          <Select id="categoryId" name="categoryId" defaultValue="">
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
          <Select id="baseUnitId" name="baseUnitId" required defaultValue="">
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

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="price">售價</Label>
          <Input id="price" name="price" type="number" step="0.01" defaultValue="0" />
        </div>
        <div>
          <Label htmlFor="standardCost">標準成本</Label>
          <Input id="standardCost" name="standardCost" type="number" step="0.01" defaultValue="0" />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <Label htmlFor="safetyStock">安全庫存量</Label>
          <Input id="safetyStock" name="safetyStock" type="number" step="0.0001" defaultValue="0" />
        </div>
        <div>
          <Label htmlFor="reorderPoint">補貨點</Label>
          <Input id="reorderPoint" name="reorderPoint" type="number" step="0.0001" defaultValue="0" />
        </div>
        <div>
          <Label htmlFor="shelfLifeDays">保存天數（選填）</Label>
          <Input id="shelfLifeDays" name="shelfLifeDays" type="number" />
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm text-gray-700">
        <input type="checkbox" name="trackStock" defaultChecked className="h-4 w-4" />
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
          {pending ? "儲存中…" : "建立商品"}
        </Button>
      </div>
    </form>
  );
}
