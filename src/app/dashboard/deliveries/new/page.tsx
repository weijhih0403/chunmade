import Link from "next/link";
import { requirePermission } from "@/lib/permissions";
import { formatDate } from "@/lib/dates";
import {
  listDeliveryFormItems,
  listDeliveryStores,
} from "@/modules/delivery/service";
import { BackButton } from "@/components/layout/back-button";
import { PageHeader } from "@/components/layout/page-header";
import { DeliveryNoteForm } from "./delivery-form";

export const dynamic = "force-dynamic";

export default async function NewDeliveryPage({
  searchParams,
}: {
  searchParams: Promise<{ store?: string }>;
}) {
  const { store: preselectedStore } = await searchParams;
  const actor = await requirePermission("delivery.manage");
  const [stores, items] = await Promise.all([
    listDeliveryStores(actor),
    listDeliveryFormItems(actor),
  ]);
  const today = formatDate(new Date());

  return (
    <div className="space-y-4">
      <BackButton fallbackHref="/dashboard/deliveries" />
      <PageHeader
        title="新增送貨單"
        description="為門市建立今日送貨清單，送貨員可在詳情頁逐項標記已送"
      />
      <DeliveryNoteForm
        stores={stores.map((s) => ({ id: s.id, name: s.name }))}
        items={items.map((i) => ({ id: i.id, name: i.name, unit: i.baseUnit.name }))}
        defaultDate={today}
        defaultStoreId={preselectedStore}
      />
    </div>
  );
}
