"use client";

import { useActionState } from "react";
import { adjustStockAction, wasteAction } from "@/modules/inventory/actions";
import { initialFormState } from "@/lib/forms";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { SearchableSelect } from "@/components/ui/searchable-select";

type Opt = { id: string; name: string };

function Feedback({ ok, message }: { ok: boolean; message: string | null }) {
  if (!message) return null;
  return (
    <p className={`text-sm ${ok ? "text-green-600" : "text-red-600"}`}>{message}</p>
  );
}

export function AdjustForm({ warehouses, items }: { warehouses: Opt[]; items: Opt[] }) {
  const [state, action, pending] = useActionState(adjustStockAction, initialFormState);
  return (
    <form action={action} className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <Label>倉庫</Label>
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
        <div>
          <Label>商品</Label>
          <SearchableSelect name="itemId" options={items} required placeholder="搜尋商品…" />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <Label>方向</Label>
          <Select name="mode" defaultValue="IN">
            <option value="IN">盤盈（增加）</option>
            <option value="OUT">盤虧（減少）</option>
          </Select>
        </div>
        <div>
          <Label>數量</Label>
          <Input name="quantity" type="number" step="0.0001" required />
        </div>
      </div>
      <div>
        <Label>原因</Label>
        <Input name="reason" placeholder="例如：盤點差異" />
      </div>
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "處理中…" : "送出調整"}
        </Button>
        <Feedback ok={state.ok} message={state.message} />
      </div>
    </form>
  );
}

export function WasteForm({ warehouses, items }: { warehouses: Opt[]; items: Opt[] }) {
  const [state, action, pending] = useActionState(wasteAction, initialFormState);
  return (
    <form action={action} className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <Label>倉庫</Label>
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
        <div>
          <Label>商品</Label>
          <SearchableSelect name="itemId" options={items} required placeholder="搜尋商品…" />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <Label>數量</Label>
          <Input name="quantity" type="number" step="0.0001" required />
        </div>
        <div>
          <Label>報廢原因</Label>
          <Input name="reason" required placeholder="例如：過期" />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Button type="submit" variant="danger" disabled={pending}>
          {pending ? "處理中…" : "報廢出庫"}
        </Button>
        <Feedback ok={state.ok} message={state.message} />
      </div>
    </form>
  );
}
