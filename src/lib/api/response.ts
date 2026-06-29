import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AppError, toAppError, ValidationError } from "@/lib/errors";

export type ApiSuccess<T> = {
  ok: true;
  data: T;
};

export type ApiFailure = {
  ok: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
};

export type ApiResult<T> = ApiSuccess<T> | ApiFailure;

export function ok<T>(data: T, init?: ResponseInit): NextResponse<ApiSuccess<T>> {
  return NextResponse.json({ ok: true, data }, init);
}

export function fail(error: AppError): NextResponse<ApiFailure> {
  return NextResponse.json(
    {
      ok: false,
      error: { code: error.code, message: error.message, details: error.details },
    },
    { status: error.httpStatus },
  );
}

/** 統一處理 API Route 的錯誤 */
export function handleApiError(err: unknown): NextResponse<ApiFailure> {
  if (err instanceof ZodError) {
    const ve = new ValidationError("輸入資料驗證失敗", err.flatten());
    return fail(ve);
  }
  return fail(toAppError(err));
}
