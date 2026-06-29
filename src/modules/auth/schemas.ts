import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("請輸入有效的 Email"),
  password: z.string().min(1, "請輸入密碼"),
});

export const applySchema = z.object({
  name: z.string().min(1, "請輸入姓名"),
  email: z.string().email("請輸入有效的 Email"),
  phone: z.string().optional(),
  password: z.string().min(8, "密碼至少 8 碼"),
  confirmPassword: z.string().min(8, "請再次輸入密碼"),
}).refine((d) => d.password === d.confirmPassword, {
  message: "兩次輸入的密碼不一致",
  path: ["confirmPassword"],
});

export type LoginInput = z.infer<typeof loginSchema>;
export type ApplyInput = z.infer<typeof applySchema>;
