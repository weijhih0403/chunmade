import { requirePermission } from "@/lib/permissions";
import { formatDate } from "@/lib/dates";
import { ensureTodayDeliveriesFromCounts } from "@/modules/delivery/generate-from-count";
import { listStoresWithTodayDeliveries } from "@/modules/delivery/service";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Badge, EmptyState } from "@/components/ui/table";
import { DELIVERY_STATUS } from "@/modules/delivery/labels";
import { DeliveryStoreCard } from "./delivery-store-card";

export const dynamic = "force-dynamic";

export default async function DeliveriesPage() {
  const actor = await requirePermission("delivery.read");
  const canManage = actor.permissions.has("delivery.manage");

  if (canManage) {
    await ensureTodayDeliveriesFromCounts(actor);
  }

  const rows = await listStoresWithTodayDeliveries(actor);
  const todayLabel = formatDate(new Date());

  return (
    <div>
      <PageHeader
        title="送貨單"
        description={`各門市今日（${todayLabel}）配送清單 · 依昨日盤點「要叫的貨」自動產生 · 點選品項標記已送`}
      />

      {rows.length === 0 ? (
        <EmptyState message="尚無可存取的門市。" />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((row) => (
            <DeliveryStoreCard key={row.store.id} row={row} canManage={canManage} />
          ))}
        </div>
      )}
    </div>
  );
}
