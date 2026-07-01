"use client";

import { useActionState } from "react";
import { generateDeliveryFromCountAction } from "@/modules/delivery/actions";
import { initialFormState } from "@/lib/forms";
import { Button } from "@/components/ui/button";

export function GenerateDeliveryButton({ storeId }: { storeId: string }) {
  const [state, action, pending] = useActionState(generateDeliveryFromCountAction, initialFormState);

  return (
    <form action={action} className="mt-3 space-y-2">
      <input type="hidden" name="storeId" value={storeId} />
      <Button type="submit" variant="outline" className="w-full" disabled={pending}>
        {pending ? "產生中…" : "從昨日盤點產生送貨單"}
      </Button>
      {state.message && (
        <p className={`text-xs ${state.ok ? "text-green-700" : "text-red-600"}`}>{state.message}</p>
      )}
    </form>
  );
}
