import { Prisma } from "@prisma/client";

/**
 * 金額 / 數量一律使用 Prisma.Decimal，禁止以 JavaScript 浮點數直接計算金額。
 * 金額對外顯示固定 2 位小數，資料庫儲存 Decimal(18,4)。
 */
export type DecimalInput = Prisma.Decimal | number | string;

export const Decimal = Prisma.Decimal;
export type Decimal = Prisma.Decimal;

export const ZERO = new Prisma.Decimal(0);

export function toDecimal(value: DecimalInput): Prisma.Decimal {
  return value instanceof Prisma.Decimal ? value : new Prisma.Decimal(value);
}

export function add(...values: DecimalInput[]): Prisma.Decimal {
  return values.reduce<Prisma.Decimal>((acc, v) => acc.add(toDecimal(v)), ZERO);
}

export function sub(a: DecimalInput, b: DecimalInput): Prisma.Decimal {
  return toDecimal(a).sub(toDecimal(b));
}

export function mul(a: DecimalInput, b: DecimalInput): Prisma.Decimal {
  return toDecimal(a).mul(toDecimal(b));
}

export function div(a: DecimalInput, b: DecimalInput): Prisma.Decimal {
  const divisor = toDecimal(b);
  if (divisor.isZero()) {
    throw new Error("除數不可為零");
  }
  return toDecimal(a).div(divisor);
}

/** 金額四捨五入到 2 位小數（顯示 / 收款用） */
export function roundCurrency(value: DecimalInput): Prisma.Decimal {
  return toDecimal(value).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
}

/** 數量四捨五入到 4 位小數 */
export function roundQuantity(value: DecimalInput): Prisma.Decimal {
  return toDecimal(value).toDecimalPlaces(4, Prisma.Decimal.ROUND_HALF_UP);
}

export function isNegative(value: DecimalInput): boolean {
  return toDecimal(value).isNegative();
}

export function gt(a: DecimalInput, b: DecimalInput): boolean {
  return toDecimal(a).greaterThan(toDecimal(b));
}

export function gte(a: DecimalInput, b: DecimalInput): boolean {
  return toDecimal(a).greaterThanOrEqualTo(toDecimal(b));
}

export function lt(a: DecimalInput, b: DecimalInput): boolean {
  return toDecimal(a).lessThan(toDecimal(b));
}

export function eq(a: DecimalInput, b: DecimalInput): boolean {
  return toDecimal(a).equals(toDecimal(b));
}

/** 行小計：數量 * 單價 - 折扣 */
export function lineTotal(
  quantity: DecimalInput,
  unitPrice: DecimalInput,
  discount: DecimalInput = ZERO,
): Prisma.Decimal {
  return roundCurrency(sub(mul(quantity, unitPrice), discount));
}

/** 格式化為新台幣字串 */
export function formatTWD(value: DecimalInput): string {
  const n = roundCurrency(value).toNumber();
  return new Intl.NumberFormat("zh-TW", {
    style: "currency",
    currency: "TWD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(n);
}
