import { z } from "zod";
import { ItemType, TaxType } from "@prisma/client";

const decimalString = z
  .string()
  .or(z.number())
  .transform((v) => String(v))
  .refine((v) => v === "" || !Number.isNaN(Number(v)), "必須為數字");

export const itemSchema = z.object({
  sku: z.string().min(1, "請輸入 SKU"),
  barcode: z.string().optional().or(z.literal("")),
  name: z.string().min(1, "請輸入名稱"),
  type: z.nativeEnum(ItemType),
  categoryId: z.string().optional().or(z.literal("")),
  baseUnitId: z.string().min(1, "請選擇基本單位"),
  taxType: z.nativeEnum(TaxType).default("TAXABLE"),
  price: decimalString.default("0"),
  standardCost: decimalString.default("0"),
  trackStock: z.coerce.boolean().default(true),
  safetyStock: decimalString.default("0"),
  reorderPoint: decimalString.default("0"),
  shelfLifeDays: z
    .string()
    .optional()
    .transform((v) => (v && v !== "" ? Number(v) : null)),
  supplierId: z.string().optional().or(z.literal("")),
});

export const categorySchema = z.object({
  code: z.string().min(1, "請輸入代碼"),
  name: z.string().min(1, "請輸入名稱"),
});

export const unitSchema = z.object({
  code: z.string().min(1, "請輸入代碼"),
  name: z.string().min(1, "請輸入名稱"),
});

export type ItemInput = z.infer<typeof itemSchema>;
