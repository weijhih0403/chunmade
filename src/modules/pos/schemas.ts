import { z } from "zod";
import { OrderChannel, PaymentMethod } from "@prisma/client";

export const checkoutLineSchema = z.object({
  itemId: z.string().min(1),
  quantity: z.number().positive(),
  note: z.string().optional(),
});

export const checkoutSchema = z.object({
  idempotencyKey: z.string().min(8, "缺少防重複鍵"),
  channel: z.nativeEnum(OrderChannel).default("TAKEOUT"),
  paymentMethod: z.nativeEnum(PaymentMethod).default("CASH"),
  amountTendered: z.number().min(0),
  customerId: z.string().optional(),
  lines: z.array(checkoutLineSchema).min(1, "購物車是空的"),
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;

export const refundSchema = z.object({
  orderId: z.string().min(1),
  reason: z.string().optional(),
});
