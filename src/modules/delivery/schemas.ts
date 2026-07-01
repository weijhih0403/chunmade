import { z } from "zod";

const lineSchema = z.object({
  itemId: z.string().min(1),
  quantity: z.number().positive(),
  note: z.string().optional(),
});

export const createDeliveryNoteSchema = z.object({
  storeId: z.string().min(1),
  deliveryDate: z.string().optional(),
  note: z.string().optional(),
  lines: z.array(lineSchema).min(1, "請至少新增一項品項"),
});

export const addDeliveryItemsSchema = z.object({
  deliveryId: z.string().min(1),
  lines: z.array(lineSchema).min(1, "請至少新增一項品項"),
});
