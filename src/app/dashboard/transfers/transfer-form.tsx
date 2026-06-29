"use client";

import { useActionState } from "react";
import { transferAction } from "@/modules/inventory/actions";
import { initialFormState } from "@/lib/forms";
import { Button } from "@/components/ui/button";
import { Label, Select, Input } from "@/components/ui/input";

type Opt = { id: string; name: string };

export function TransferForm({ warehouses, items }: { warehouses: Opt[]; items: Opt[] }) {
  const [state, action, pending] = useActionState(transferAction, initialFormState);
  return (
    <form action={action} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>來源倉庫</Label>
          <Select name="fromWarehouseId" required defaultValue="">
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
        <div>
          <Label>目的倉庫</Label>
          <Select name="toWarehouseId" required defaultValue="">
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
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>商品</Label>
          <Select name="itemId" required defaultValue="">
            <option value="" disabled>
              請選擇
            </option>
            {items.map((i) => (
              <option key={i.id} value={i.id}>
                {i.name}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label>數量</Label>
          <Input name="quantity" type="number" step="0.0001" required />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "處理中…" : "確認調撥"}
        </Button>
        {state.message && (
          <span className={`text-sm ${state.ok ? "text-green-600" : "text-red-600"}`}>
            {state.message}
          </span>
        )}
      </div>
    </form>
  );
}
