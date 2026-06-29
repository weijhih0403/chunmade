import { describe, it, expect } from "vitest";
import type { Prisma } from "@prisma/client";
import { applyStockMovement } from "@/server/services/stock";
import { BusinessRuleError } from "@/lib/errors";

/** 記憶體假交易客戶端，模擬 stockBalance / stockMovement */
function makeFakeTx() {
  const balances: any[] = [];
  const movements: any[] = [];
  let seq = 0;
  const tx = {
    stockBalance: {
      findFirst: async ({ where }: any) =>
        balances.find(
          (b) =>
            b.itemId === where.itemId &&
            b.warehouseId === where.warehouseId &&
            (b.lotId ?? null) === (where.lotId ?? null),
        ) ?? null,
      update: async ({ where, data }: any) => {
        const b = balances.find((x) => x.id === where.id);
        Object.assign(b, data);
        return b;
      },
      create: async ({ data }: any) => {
        const b = { id: `b${++seq}`, ...data };
        balances.push(b);
        return b;
      },
    },
    stockMovement: {
      create: async ({ data }: any) => {
        const m = { id: `m${++seq}`, ...data };
        movements.push(m);
        return m;
      },
    },
  };
  return { tx: tx as unknown as Prisma.TransactionClient, balances, movements };
}

const base = { companyId: "c1", warehouseId: "w1", itemId: "i1" };

describe("applyStockMovement", () => {
  it("採購入庫後增加庫存並設定均價", async () => {
    const { tx, balances } = makeFakeTx();
    const r = await applyStockMovement(tx, {
      ...base,
      type: "PURCHASE_RECEIPT",
      quantity: 100,
      unitCost: 10,
    });
    expect(r.quantityAfter.toString()).toBe("100");
    expect(balances[0].quantity.toString()).toBe("100");
    expect(balances[0].avgCost.toString()).toBe("10");
  });

  it("再次入庫以移動平均更新成本", async () => {
    const { tx } = makeFakeTx();
    await applyStockMovement(tx, { ...base, type: "PURCHASE_RECEIPT", quantity: 100, unitCost: 10 });
    const r2 = await applyStockMovement(tx, {
      ...base,
      type: "PURCHASE_RECEIPT",
      quantity: 100,
      unitCost: 20,
    });
    // (100*10 + 100*20) / 200 = 15
    expect(r2.avgCost.toString()).toBe("15");
  });

  it("銷售出庫後減少庫存", async () => {
    const { tx } = makeFakeTx();
    await applyStockMovement(tx, { ...base, type: "INITIAL", quantity: 50, unitCost: 5 });
    const r = await applyStockMovement(tx, { ...base, type: "SALE", quantity: 20 });
    expect(r.quantityAfter.toString()).toBe("30");
  });

  it("庫存不足時禁止出庫", async () => {
    const { tx } = makeFakeTx();
    await applyStockMovement(tx, { ...base, type: "INITIAL", quantity: 10, unitCost: 5 });
    await expect(
      applyStockMovement(tx, { ...base, type: "SALE", quantity: 20 }),
    ).rejects.toThrow(BusinessRuleError);
  });

  it("允許負庫存時可出庫", async () => {
    const { tx } = makeFakeTx();
    await applyStockMovement(tx, { ...base, type: "INITIAL", quantity: 10, unitCost: 5 });
    const r = await applyStockMovement(tx, {
      ...base,
      type: "SALE",
      quantity: 20,
      allowNegative: true,
    });
    expect(r.quantityAfter.toString()).toBe("-10");
  });

  it("異動數量必須大於 0", async () => {
    const { tx } = makeFakeTx();
    await expect(
      applyStockMovement(tx, { ...base, type: "PURCHASE_RECEIPT", quantity: 0 }),
    ).rejects.toThrow(BusinessRuleError);
  });
});
