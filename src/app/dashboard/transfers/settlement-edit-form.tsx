"use client";

import { useActionState } from "react";
import { updateTransferSettlementAction } from "@/modules/inventory/actions";
import { initialFormState } from "@/lib/forms";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { SETTLEMENT_STATUS } from "@/modules/inventory/transfer-labels";
import type { TransferSettlementStatus } from "@/modules/inventory/transfer-labels";

type StoreOpt = { id: string; name: string };

export function SettlementEditForm({
  transferId,
  stores,
  defaults,
}: {
  transferId: string;
  stores: StoreOpt[];
  defaults: {
    settlementStatus: TransferSettlementStatus;
    collectFromStoreId: string | null;
    payToStoreId: string | null;
    settlementNote: string | null;
  };
}) {
  const [state, action, pending] = useActionState(updateTransferSettlementAction, initialFormState);

  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="transferId" value={transferId} />
      <div className="min-w-[100px]">
        <Select name="settlementStatus" defaultValue={defaults.settlementStatus} className="h-9 text-xs">
          {Object.entries(SETTLEMENT_STATUS).map(([k, v]) => (
            <option key={k} value={k}>
              {v.label}
            </option>
          ))}
        </Select>
      </div>
      <div className="min-w-[120px]">
        <Select
          name="collectFromStoreId"
          defaultValue={defaults.collectFromStoreId ?? ""}
          className="h-9 text-xs"
          title="向誰收款"
        >
          <option value="">（無收款）</option>
          {stores.map((s) => (
            <option key={s.id} value={s.id}>
              收：{s.name}
            </option>
          ))}
        </Select>
      </div>
      <div className="min-w-[120px]">
        <Select
          name="payToStoreId"
          defaultValue={defaults.payToStoreId ?? ""}
          className="h-9 text-xs"
          title="付給誰"
        >
          <option value="">（無付款）</option>
          {stores.map((s) => (
            <option key={s.id} value={s.id}>
              付：{s.name}
            </option>
          ))}
        </Select>
      </div>
      <Input
        name="settlementNote"
        placeholder="備註"
        defaultValue={defaults.settlementNote ?? ""}
        className="h-9 w-28 text-xs"
      />
      <Button type="submit" size="sm" variant="outline" disabled={pending}>
        {pending ? "…" : "儲存"}
      </Button>
      {state.message && !state.ok && (
        <span className="text-xs text-red-600">{state.message}</span>
      )}
    </form>
  );
}
