"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createProductionOrderAction } from "@/modules/production/actions";
import { initialFormState } from "@/lib/forms";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";

type RecipeOpt = { versionId: string; label: string };
type Opt = { id: string; name: string };

export function ProductionForm({
  recipes,
  warehouses,
}: {
  recipes: RecipeOpt[];
  warehouses: Opt[];
}) {
  const [state, action, pending] = useActionState(createProductionOrderAction, initialFormState);
  const router = useRouter();

  useEffect(() => {
    if (state.ok) {
      const t = setTimeout(() => router.push("/dashboard/production"), 800);
      return () => clearTimeout(t);
    }
  }, [state.ok, router]);

  return (
    <form action={action} className="max-w-xl space-y-4">
      <div>
        <Label>配方</Label>
        <Select name="recipeVersionId" required defaultValue="">
          <option value="" disabled>
            請選擇
          </option>
          {recipes.map((r) => (
            <option key={r.versionId} value={r.versionId}>
              {r.label}
            </option>
          ))}
        </Select>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <Label>生產倉庫</Label>
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
          <Label>計畫產量</Label>
          <Input name="plannedQty" type="number" step="0.0001" defaultValue="1" required />
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
        {pending ? "建立中…" : "建立生產單"}
      </Button>
    </form>
  );
}
