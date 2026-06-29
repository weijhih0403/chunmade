import { Prisma, StockMovementType } from "@prisma/client";
import { BusinessRuleError } from "@/lib/errors";
import { add, mul, sub, toDecimal, ZERO, gt, lt } from "@/lib/money";

/** 出庫類型（direction = -1） */
const OUTBOUND_TYPES: StockMovementType[] = [
  "SALE",
  "PRODUCTION_ISSUE",
  "TRANSFER_OUT",
  "ADJUSTMENT_OUT",
  "WASTE",
  "RETURN_OUT",
];

export function movementDirection(type: StockMovementType): number {
  return OUTBOUND_TYPES.includes(type) ? -1 : 1;
}

export type ApplyMovementInput = {
  companyId: string;
  storeId?: string | null;
  warehouseId: string;
  itemId: string;
  lotId?: string | null;
  type: StockMovementType;
  quantity: Prisma.Decimal | number | string; // 一律正數
  unitCost?: Prisma.Decimal | number | string;
  sourceType?: string;
  sourceId?: string;
  sourceNo?: string;
  reason?: string;
  operatorId?: string;
  /** 是否允許負庫存（由系統設定決定，預設不允許） */
  allowNegative?: boolean;
  occurredAt?: Date;
};

/**
 * 套用一筆庫存異動：更新 StockBalance（含移動平均成本）並寫入不可變的 StockMovement。
 * 必須在 transaction 中呼叫。出庫且結餘為負且未允許負庫存時拋出 BusinessRuleError。
 */
export async function applyStockMovement(
  tx: Prisma.TransactionClient,
  input: ApplyMovementInput,
) {
  const quantity = toDecimal(input.quantity);
  if (quantity.lessThanOrEqualTo(0)) {
    throw new BusinessRuleError("異動數量必須大於 0");
  }

  const direction = movementDirection(input.type);
  const unitCost = toDecimal(input.unitCost ?? 0);
  const lotId = input.lotId ?? null;

  // 取得或建立結餘（lotId 可為 null，使用 findFirst 而非複合唯一鍵）
  const existing = await tx.stockBalance.findFirst({
    where: { itemId: input.itemId, warehouseId: input.warehouseId, lotId },
  });

  const quantityBefore = existing ? toDecimal(existing.quantity) : ZERO;
  const signedQty = direction === -1 ? quantity.negated() : quantity;
  const quantityAfter = add(quantityBefore, signedQty);

  if (direction === -1 && lt(quantityAfter, 0) && !input.allowNegative) {
    throw new BusinessRuleError(
      `庫存不足：目前 ${quantityBefore.toString()}，需出庫 ${quantity.toString()}`,
    );
  }

  // 移動平均成本（僅入庫且有成本時更新）
  let avgCost = existing ? toDecimal(existing.avgCost) : ZERO;
  if (direction === 1 && gt(unitCost, 0)) {
    const totalValueBefore = mul(quantityBefore, avgCost);
    const totalValueIn = mul(quantity, unitCost);
    const totalQty = add(quantityBefore, quantity);
    avgCost = totalQty.isZero() ? unitCost : add(totalValueBefore, totalValueIn).div(totalQty);
  }

  if (existing) {
    await tx.stockBalance.update({
      where: { id: existing.id },
      data: { quantity: quantityAfter, avgCost },
    });
  } else {
    await tx.stockBalance.create({
      data: {
        companyId: input.companyId,
        itemId: input.itemId,
        warehouseId: input.warehouseId,
        lotId,
        quantity: quantityAfter,
        avgCost,
      },
    });
  }

  const movement = await tx.stockMovement.create({
    data: {
      companyId: input.companyId,
      storeId: input.storeId ?? null,
      warehouseId: input.warehouseId,
      itemId: input.itemId,
      lotId,
      type: input.type,
      quantity,
      direction,
      unitCost,
      quantityBefore,
      quantityAfter,
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      sourceNo: input.sourceNo,
      reason: input.reason,
      operatorId: input.operatorId,
      occurredAt: input.occurredAt ?? new Date(),
    },
  });

  return { movement, quantityBefore, quantityAfter, avgCost };
}

/** 取得品項在某倉庫的可用庫存（總量 - 已保留） */
export async function getAvailableQuantity(
  tx: Prisma.TransactionClient,
  itemId: string,
  warehouseId: string,
): Promise<Prisma.Decimal> {
  const balances = await tx.stockBalance.findMany({
    where: { itemId, warehouseId },
  });
  return balances.reduce<Prisma.Decimal>(
    (acc, b) => add(acc, sub(b.quantity, b.reserved)),
    ZERO,
  );
}
