import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  AUTH_SECRET: z.string().min(1),
  AUTH_URL: z.string().url().optional(),
  NEXTAUTH_URL: z.string().url().optional(),
  APP_TIMEZONE: z.string().default("Asia/Taipei"),
  APP_LOCALE: z.string().default("zh-TW"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  AUTH_MAX_LOGIN_ATTEMPTS: z.coerce.number().int().positive().default(5),
  AUTH_LOCK_MINUTES: z.coerce.number().int().positive().default(15),
  PRINT_AGENT_SHARED_SECRET: z.string().default("dev-print-agent-secret"),
  PRINT_SIMULATION_MODE: z
    .enum(["true", "false"])
    .default("true")
    .transform((v) => v === "true"),
});

/**
 * 在執行階段驗證環境變數。建置（next build）時若缺少資料庫連線等變數，
 * 仍允許以寬鬆模式通過，避免無 DB 環境無法建置。
 */
function loadEnv() {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    // 建置期間（無實際 DB）給予預設值，執行期間才嚴格要求
    if (process.env.NEXT_PHASE === "phase-production-build") {
      return envSchema.parse({
        ...process.env,
        DATABASE_URL: process.env.DATABASE_URL ?? "postgresql://build:build@localhost:5432/build",
        AUTH_SECRET: process.env.AUTH_SECRET ?? "build-time-placeholder-secret",
      });
    }
    console.error("環境變數驗證失敗:", parsed.error.flatten().fieldErrors);
    throw new Error("環境變數設定不完整，請參考 .env.example");
  }
  return parsed.data;
}

export const env = loadEnv();
export const APP_TIMEZONE = env.APP_TIMEZONE;
export const APP_LOCALE = env.APP_LOCALE;
