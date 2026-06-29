import { describe, it, expect } from "vitest";
import { movementDirection } from "@/server/services/stock";

describe("庫存異動方向", () => {
  it("入庫類型方向為 +1", () => {
    expect(movementDirection("PURCHASE_RECEIPT")).toBe(1);
    expect(movementDirection("PRODUCTION_RECEIPT")).toBe(1);
    expect(movementDirection("INITIAL")).toBe(1);
    expect(movementDirection("RETURN_IN")).toBe(1);
  });

  it("出庫類型方向為 -1", () => {
    expect(movementDirection("SALE")).toBe(-1);
    expect(movementDirection("PRODUCTION_ISSUE")).toBe(-1);
    expect(movementDirection("WASTE")).toBe(-1);
    expect(movementDirection("TRANSFER_OUT")).toBe(-1);
  });
});
