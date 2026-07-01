import { z } from "zod";

export const shiftClosingSchema = z.object({
  storeId: z.string().min(1, "請選擇門市"),
  closingDate: z.string().optional(),
  qty520: z.coerce.number().int().min(0),
  qty850: z.coerce.number().int().min(0),
  qty700: z.coerce.number().int().min(0),
  qty500: z.coerce.number().int().min(0),
  signatureData: z.string().min(1, "請簽名"),
  signerName: z.string().optional().or(z.literal("")),
  matchedEmployeeId: z.string().optional().or(z.literal("")),
});
