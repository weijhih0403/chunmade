import { BusinessRuleError } from "@/lib/errors";

/**
 * 通用狀態機檢查。狀態變更必須是合法轉移。
 */
export function assertTransition(
  transitions: Readonly<Record<string, readonly string[]>>,
  from: string,
  to: string,
  label = "狀態",
): void {
  const allowed = transitions[from] ?? [];
  if (!allowed.includes(to)) {
    throw new BusinessRuleError(`不允許的${label}轉移：${from} → ${to}`);
  }
}

export const PURCHASE_ORDER_TRANSITIONS = {
  DRAFT: ["PENDING_APPROVAL", "CANCELLED"],
  PENDING_APPROVAL: ["APPROVED", "DRAFT", "CANCELLED"],
  APPROVED: ["PARTIALLY_RECEIVED", "RECEIVED", "CANCELLED"],
  PARTIALLY_RECEIVED: ["PARTIALLY_RECEIVED", "RECEIVED", "CLOSED"],
  RECEIVED: ["CLOSED"],
  CANCELLED: [],
  CLOSED: [],
} as const;

export const SALES_ORDER_TRANSITIONS = {
  DRAFT: ["PENDING", "PAID", "CANCELLED"],
  PENDING: ["PAID", "CANCELLED"],
  PAID: ["PREPARING", "COMPLETED", "REFUNDED", "PARTIALLY_REFUNDED"],
  PREPARING: ["READY", "COMPLETED", "REFUNDED", "PARTIALLY_REFUNDED"],
  READY: ["COMPLETED", "REFUNDED", "PARTIALLY_REFUNDED"],
  COMPLETED: ["REFUNDED", "PARTIALLY_REFUNDED"],
  PARTIALLY_REFUNDED: ["REFUNDED", "PARTIALLY_REFUNDED"],
  CANCELLED: [],
  REFUNDED: [],
} as const;

export const PRODUCTION_ORDER_TRANSITIONS = {
  DRAFT: ["RELEASED", "CANCELLED"],
  RELEASED: ["IN_PROGRESS", "CANCELLED"],
  IN_PROGRESS: ["COMPLETED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
} as const;

export const TRANSFER_TRANSITIONS = {
  DRAFT: ["PENDING", "CANCELLED"],
  PENDING: ["IN_TRANSIT", "CANCELLED"],
  IN_TRANSIT: ["COMPLETED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
} as const;
