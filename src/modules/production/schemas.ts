import { z } from "zod";

export const recipeLineSchema = z.object({
  materialId: z.string().min(1),
  quantity: z.coerce.number().positive(),
  wasteRate: z.coerce.number().min(0).max(1).default(0),
});

export const recipeSchema = z.object({
  productId: z.string().min(1, "請選擇產出品項"),
  name: z.string().min(1, "請輸入配方名稱"),
  outputQty: z.coerce.number().positive("標準產量需大於 0"),
  lines: z.array(recipeLineSchema).min(1, "至少需要一項原料"),
});

export const productionOrderSchema = z.object({
  recipeVersionId: z.string().min(1, "請選擇配方"),
  warehouseId: z.string().min(1, "請選擇倉庫"),
  plannedQty: z.coerce.number().positive("計畫產量需大於 0"),
});
