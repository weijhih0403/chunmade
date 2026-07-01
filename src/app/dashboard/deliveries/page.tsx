import Link from "next/link";
import { requirePermission } from "@/lib/permissions";
import { formatDate } from "@/lib/dates";
import { listStoresWithTodayDeliveries } from "@/modules/delivery/service";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Badge, EmptyState } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { DELIVERY_STATUS } from "@/modules/delivery/labels";

export const dynamic = "force-dynamic";

export default async function DeliveriesPage() {
  const actor = await requirePermission("delivery.read");
  const rows = await listStoresWithTodayDeliveries(actor);
  const canManage = actor.permissions.has("delivery.manage");
  const todayLabel = formatDate(new Date());

  return (
    <div>
      <PageHeader
        title="送貨單"
        description={`各門市今日（${todayLabel}）配送清單 · 點進去可標記已送品項`}
        action={
          canManage ? (
            <Link href="/dashboard/deliveries/new">
              <Button>新增送貨單</Button>
            </Link>
          ) : null
        }
      />

      {rows.length === 0 ? (
        <EmptyState message="尚無可存取的門市。" />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map(({ store, note }) => (
            <Card key={store.id} className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-gray-900">{store.name}</p>
                  <p className="font-mono text-xs text-gray-400">{store.code}</p>
                </div>
                {note && (
                  <Badge color={DELIVERY_STATUS[note.status].color}>
                    {DELIVERY_STATUS[note.status].label}
                  </Badge>
                )}
              </div>

              {note ? (
                <>
                  <p className="mt-3 text-sm text-gray-600">
                    已送 <span className="font-semibold text-gray-900">{note.delivered}</span> /{" "}
                    {note.total} 項
                  </p>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-gray-100">
                    <div
                      className="h-full rounded-full bg-gray-900 transition-all"
                      style={{
                        width: note.total > 0 ? `${(note.delivered / note.total) * 100}%` : "0%",
                      }}
                    />
                  </div>
                  <Link
                    href={`/dashboard/deliveries/${note.id}`}
                    className="mt-4 inline-flex h-10 w-full items-center justify-center rounded-lg bg-amber-600 text-sm font-medium text-white hover:bg-amber-700"
                  >
                    開啟送貨單
                  </Link>
                </>
              ) : (
                <div className="mt-4">
                  <p className="text-sm text-gray-500">今日尚無送貨單</p>
                  {canManage && (
                    <Link
                      href={`/dashboard/deliveries/new?store=${store.id}`}
                      className="mt-2 inline-block text-sm font-medium text-amber-700 hover:underline"
                    >
                      建立送貨單 →
                    </Link>
                  )}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
