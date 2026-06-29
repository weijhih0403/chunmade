import { describe, it, expect } from "vitest";
import {
  assertTransition,
  PURCHASE_ORDER_TRANSITIONS,
  SALES_ORDER_TRANSITIONS,
} from "@/lib/state-machine";
import { BusinessRuleError } from "@/lib/errors";

describe("state-machine", () => {
  it("允許合法的採購單狀態轉移", () => {
    expect(() =>
      assertTransition(PURCHASE_ORDER_TRANSITIONS, "DRAFT", "PENDING_APPROVAL"),
    ).not.toThrow();
  });

  it("拒絕非法的採購單狀態轉移", () => {
    expect(() => assertTransition(PURCHASE_ORDER_TRANSITIONS, "DRAFT", "RECEIVED")).toThrow(
      BusinessRuleError,
    );
  });

  it("已取消的銷售訂單不可再轉移", () => {
    expect(() => assertTransition(SALES_ORDER_TRANSITIONS, "CANCELLED", "PAID")).toThrow();
  });
});
