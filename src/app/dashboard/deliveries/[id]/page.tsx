import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/permissions";
import { formatDate } from "@/lib/dates";
import {
  getDeliveryNote,
  listDeliveryFormItems,
} from "@/modules/delivery/service";
import { resetDeliveryNoteAction } from "@/modules/delivery/actions";
import { BackButton } from "@/components/layout/back-button";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { DELIVERY_STATUS } from "@/modules/delivery/labels";
import { DeliveryChecklist } from "./delivery-checklist";
import { AddDeliveryItemsForm } from "./add-items-form";

export const dynamic = "force-dynamic";

export default async function DeliveryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const actor = await requirePermission("delivery.read");
  const note = await getDeliveryNote(actor, id);
  if (!note) notFound();

  const canManage = actor.permissions.has("delivery.manage");
  const canToggle = actor.permissions.has("delivery.confirm");
  const delivered = note.items.filter((i) => i.isDelivered).length;
  const total = note.items.length;

  const formItems = canManage
    ? await listDeliveryFormItems(actor)
    : [];

  return (
    <div className="space-y-4">
      <BackButton fallbackHref="/dashboard/deliveries" />
      <PageHeader
        title={`${note.store.name} 送貨單`}
        description={`${note.deliveryNo} · ${formatDate(note.deliveryDate)}`}
        action={
          canManage && total > 0 ? (
            <form action={resetDeliveryNoteAction}>
              <input type="hidden" name="deliveryId" value={note.id} />
              <Button type="submit" variant="outline" size="sm">
                全部重設
              </Button>
            </form>
          ) : null
        }
      />

      <div className="flex flex-wrap items-center gap-3 text-sm">
        <Badge color={DELIVERY_STATUS[note.status].color}>
          {DELIVERY_STATUS[note.status].label}
        </Badge>
        <span className="text-gray-600">
          進度 {delivered} / {total}
        </span>
        {canToggle && (
          <span className="text-gray-400">點擊品項可切換已送 / 未送</span>
        )}
      </div>

      <DeliveryChecklist
        canToggle={canToggle && note.status !== "CANCELLED"}
        lines={note.items.map((line) => ({
          id: line.id,
          name: line.item.name,
          quantity: line.quantity.toString(),
          unit: line.item.baseUnit.name,
          note: line.note,
          isDelivered: line.isDelivered,
        }))}
      />

      {canManage && note.status !== "COMPLETED" && (
        <AddDeliveryItemsForm
          deliveryId={note.id}
          items={formItems.map((i) => ({
            id: i.id,
            name: i.name,
            unit: i.baseUnit.name,
          }))}
        />
      )}
    </div>
  );
}
