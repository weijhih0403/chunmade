import { ZodError } from "zod";
import { isAppError } from "@/lib/errors";

export type FormState = {
  ok: boolean;
  message: string | null;
  fieldErrors?: Record<string, string[] | undefined>;
};

export const initialFormState: FormState = { ok: false, message: null };

/** 將例外（Zod / AppError / 其他）轉為一致的表單狀態 */
export function toFormError(err: unknown): FormState {
  if (err instanceof ZodError) {
    return { ok: false, message: "輸入資料驗證失敗", fieldErrors: err.flatten().fieldErrors };
  }
  if (isAppError(err)) {
    return { ok: false, message: err.message };
  }
  if (err instanceof Error) {
    return { ok: false, message: err.message };
  }
  return { ok: false, message: "發生未預期的錯誤" };
}
