import { z } from "zod";

export const supplierSchema = z.object({
  code: z.string().min(1, "請輸入代碼"),
  name: z.string().min(1, "請輸入名稱"),
  contact: z.string().optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  email: z.string().email("Email 格式錯誤").optional().or(z.literal("")),
});

export const poLineSchema = z.object({
  itemId: z.string().min(1),
  quantity: z.coerce.number().positive(),
  unitPrice: z.coerce.number().min(0),
});

export const purchaseOrderSchema = z.object({
  supplierId: z.string().min(1, "請選擇供應商"),
  warehouseId: z.string().min(1, "請選擇入庫倉庫"),
  expectedDate: z.string().optional().or(z.literal("")),
  note: z.string().optional().or(z.literal("")),
  lines: z.array(poLineSchema).min(1, "至少需要一筆明細"),
});

export type PoLine = z.infer<typeof poLineSchema>;
