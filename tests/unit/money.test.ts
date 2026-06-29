import { describe, it, expect } from "vitest";
import { add, sub, mul, lineTotal, roundCurrency, toDecimal } from "@/lib/money";

describe("money", () => {
  it("加總不產生浮點誤差", () => {
    expect(add("0.1", "0.2").toString()).toBe("0.3");
  });

  it("行小計 = 數量 × 單價 − 折扣", () => {
    expect(lineTotal(3, 45, 5).toString()).toBe("130");
  });

  it("金額四捨五入到 2 位", () => {
    expect(roundCurrency("10.005").toString()).toBe("10.01");
  });

  it("減法與乘法正確", () => {
    expect(sub(100, 30).toString()).toBe("70");
    expect(mul("2.5", "4").toString()).toBe("10");
  });

  it("toDecimal 可接受字串/數字", () => {
    expect(toDecimal("12.34").toFixed(2)).toBe("12.34");
  });
});
