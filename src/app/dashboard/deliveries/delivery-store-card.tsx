import Link from "next/link";
import type { DeliveryNoteStatus } from "@prisma/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/table";
import type { StoreDeliveryRow } from "@/modules/delivery/service";
import { DELIVERY_STATUS } from "@/modules/delivery/labels";
import { GenerateDeliveryButton } from "./generate-delivery-button";

function noNoteMessage(row: StoreDeliveryRow) {
  const { preview } = row;
  if (!preview.hasWarehouse) {
    return "此門市尚未設定倉庫，無法對應盤點";
  }
  if (!preview.hasCount) {
    return `昨日（${preview.countDateLabel}）尚無完成盤點`;
  }
  if (preview.orderItemCount === 0) {
    return `昨日盤點（${preview.countNos.join("、")}）無叫貨項目`;
  }
  return "今日尚無送貨單";
}

export function DeliveryStoreCard({
  row,
  canManage,
}: {
  row: StoreDeliveryRow;
  canManage: boolean;
}) {
  const { store, note, preview } = row;

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-medium text-gray-900">{store.name}</p>
          <p className="font-mono text-xs text-gray-400">{store.code}</p>
        </div>
        {note && (
          <Badge color={DELIVERY_STATUS[note.status as DeliveryNoteStatus].color}>
            {DELIVERY_STATUS[note.status as DeliveryNoteStatus].label}
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
          {preview.hasCount && preview.orderItemCount > 0 && (
            <p className="mt-2 text-xs text-gray-400">
              來源：{preview.countDateLabel} 盤點 · {preview.countNos.join("、")}
            </p>
          )}
          <Link
            href={`/dashboard/deliveries/${note.id}`}
            className="mt-4 inline-flex h-10 w-full items-center justify-center rounded-lg bg-amber-600 text-sm font-medium text-white hover:bg-amber-700"
          >
            開啟送貨清單
          </Link>
        </>
      ) : (
        <div className="mt-4">
          <p className="text-sm text-gray-500">{noNoteMessage(row)}</p>
          {canManage && preview.orderItemCount > 0 && (
            <GenerateDeliveryButton storeId={store.id} />
          )}
        </div>
      )}
    </Card>
  );
}
