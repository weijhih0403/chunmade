import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * 健康檢查 / 保溫端點。
 * 以最輕量的查詢喚醒資料庫，搭配外部定時 ping（例如每 5 分鐘）即可
 * 避免 Neon 免費方案的閒置休眠造成的「冷啟動」延遲。
 */
export async function GET() {
  const startedAt = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({
      ok: true,
      dbLatencyMs: Date.now() - startedAt,
      timestamp: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json({ ok: false }, { status: 503 });
  }
}
