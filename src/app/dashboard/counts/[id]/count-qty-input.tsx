"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

function isStepUnit(unit: string, unitCode?: string) {
  return (
    unit === "包" ||
    unit === "瓶" ||
    unit === "個" ||
    unit === "鍋" ||
    unit === "箱" ||
    unitCode === "bag" ||
    unitCode === "bottle" ||
    unitCode === "pcs" ||
    unitCode === "pot" ||
    unitCode === "box"
  );
}

export function CountQtyInput({
  name,
  unit,
  unitCode,
  defaultValue = "0",
  ariaLabel,
}: {
  name: string;
  unit: string;
  unitCode?: string;
  defaultValue?: string;
  ariaLabel?: string;
}) {
  const step = isStepUnit(unit, unitCode);
  const [value, setValue] = useState(() => {
    if (step) return String(Math.max(0, Math.floor(Number(defaultValue) || 0)));
    return defaultValue;
  });

  if (step) {
    const qty = Math.max(0, Math.floor(Number(value) || 0));
    const unitLabel = unit || "數量";
    return (
      <div className="inline-flex items-center justify-end gap-1">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-9 w-9 shrink-0 px-0"
          aria-label={`減少 1 ${unitLabel}`}
          onClick={() => setValue(String(Math.max(0, qty - 1)))}
        >
          −
        </Button>
        <input type="hidden" name={name} value={String(qty)} />
        <span className="w-12 text-center font-mono text-sm tabular-nums">{qty}</span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-9 w-9 shrink-0 px-0"
          aria-label={`增加 1 ${unitLabel}`}
          onClick={() => setValue(String(qty + 1))}
        >
          +
        </Button>
      </div>
    );
  }

  return (
    <input
      name={name}
      type="number"
      step="0.0001"
      min="0"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      aria-label={ariaLabel}
      className="h-9 w-28 rounded border border-gray-300 px-2 text-right"
    />
  );
}
