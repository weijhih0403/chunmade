import { requireActor } from "@/lib/permissions";
import { getDashboardStats } from "@/modules/reports/dashboard-service";
import { formatTWD } from "@/lib/money";
import { Card, CardContent } from "@/components/ui/card";

export const dynamic = "force-dynamic";

function StatCard({
  label,
  value,
  hint,
  highlight,
}: {
  label: string;
  value: string;
  hint?: string;
  highlight?: boolean;
}) {
  return (
    <Card>
      <CardContent>
        <p className="text-sm text-gray-500">{label}</p>
        <p
          className={`mt-1 text-2xl font-bold ${highlight ? "text-amber-700" : "text-gray-900"}`}
        >
          {value}
        </p>
        {hint && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
      </CardContent>
    </Card>
  );
}

export default async function DashboardPage() {
  const actor = await requireActor();

  if (!actor.companyId) {
    return (
      <div className="rounded-lg bg-yellow-50 p-4 text-sm text-yellow-800">
        您的帳號尚未指派公司，請聯絡管理員。
      </div>
    );
  }

  const stats = await getDashboardStats(actor.companyId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">儀表板</h1>
        <p className="text-sm text-gray-500">即時營運概況（資料來自資料庫即時查詢）</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="今日營業額" value={formatTWD(stats.todayRevenue)} highlight />
        <StatCard label="今日訂單數" value={`${stats.todayOrderCount} 筆`} />
        <StatCard label="平均客單價" value={formatTWD(stats.avgOrderValue)} />
        <StatCard label="今日毛利" value={formatTWD(stats.todayGrossProfit)} />
        <StatCard label="本月營收" value={formatTWD(stats.monthRevenue)} />
        <StatCard label="低庫存品項" value={`${stats.lowStockCount} 項`} hint="低於補貨點" />
        <StatCard label="待收貨採購單" value={`${stats.pendingPurchaseCount} 張`} />
        <StatCard label="待完成生產單" value={`${stats.pendingProductionCount} 張`} />
      </div>

      {stats.pendingUserCount > 0 && actor.permissions.has("user.approve") && (
        <Card>
          <CardContent>
            <p className="text-sm text-gray-700">
              有 <span className="font-bold text-amber-700">{stats.pendingUserCount}</span>{" "}
              筆帳號申請待審核。
              <a href="/dashboard/review-users" className="ml-2 text-amber-700 hover:underline">
                前往審核 →
              </a>
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
