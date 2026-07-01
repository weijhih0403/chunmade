import Link from "next/link";
import type { ItemType } from "@prisma/client";
import type { Decimal } from "@prisma/client/runtime/library";
import { deleteItemAction } from "@/modules/catalog/actions";
import { Table, THead, TH, TR, TD, Badge } from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";
import { formatTWD } from "@/lib/money";
import { ITEM_TYPE_LABELS } from "@/lib/constants";

export type CatalogListItem = {
  id: string;
  sku: string;
  name: string;
  type: ItemType;
  price: Decimal;
  standardCost: Decimal;
  trackStock: boolean;
  category: { name: string } | null;
  baseUnit: { name: string };
};

function editHref(itemId: string, from?: "materials") {
  const base = `/dashboard/items/${itemId}/edit`;
  return from === "materials" ? `${base}?from=materials` : base;
}

function ItemActions({
  item,
  canManage,
  from,
}: {
  item: CatalogListItem;
  canManage: boolean;
  from?: "materials";
}) {
  if (!canManage) return null;
  return (
    <div className="flex items-center gap-3">
      <Link href={editHref(item.id, from)} className="text-sm font-medium text-amber-700 hover:underline">
        編輯
      </Link>
      <form action={deleteItemAction}>
        <input type="hidden" name="itemId" value={item.id} />
        <ConfirmSubmitButton
          variant="ghost"
          size="sm"
          pendingText="刪除中…"
          confirmMessage={`確定要刪除「${item.name}」？`}
        >
          <span className="text-sm text-red-600">刪除</span>
        </ConfirmSubmitButton>
      </form>
    </div>
  );
}

function MobileCard({
  item,
  canManage,
  from,
}: {
  item: CatalogListItem;
  canManage: boolean;
  from?: "materials";
}) {
  const isMaterial = from === "materials";
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-medium text-gray-900">{item.name}</p>
          <p className="mt-0.5 font-mono text-xs text-gray-400">{item.sku}</p>
        </div>
        <Badge color="blue">{ITEM_TYPE_LABELS[item.type]}</Badge>
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        <div>
          <dt className="text-xs text-gray-400">分類</dt>
          <dd className="text-gray-700">{item.category?.name ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-xs text-gray-400">單位</dt>
          <dd className="text-gray-700">{item.baseUnit.name}</dd>
        </div>
        <div className={isMaterial ? "col-span-2" : undefined}>
          <dt className="text-xs text-gray-400">{isMaterial ? "標準成本" : "售價"}</dt>
          <dd className="font-medium text-gray-900">
            {formatTWD(isMaterial ? item.standardCost : item.price)}
          </dd>
        </div>
        {!isMaterial && (
          <div>
            <dt className="text-xs text-gray-400">標準成本</dt>
            <dd className="text-gray-700">{formatTWD(item.standardCost)}</dd>
          </div>
        )}
        <div>
          <dt className="text-xs text-gray-400">庫存</dt>
          <dd>
            {item.trackStock ? <Badge color="green">管理</Badge> : <Badge>不管理</Badge>}
          </dd>
        </div>
      </dl>
      {canManage && (
        <div className="mt-3 border-t border-gray-100 pt-3">
          <ItemActions item={item} canManage={canManage} from={from} />
        </div>
      )}
    </Card>
  );
}

export function ItemCatalogList({
  items,
  canManage,
  from,
}: {
  items: CatalogListItem[];
  canManage: boolean;
  from?: "materials";
}) {
  const isMaterial = from === "materials";
  return (
    <>
      <div className="space-y-3 md:hidden">
        {items.map((item) => (
          <MobileCard key={item.id} item={item} canManage={canManage} from={from} />
        ))}
      </div>

      <div className="hidden md:block">
        <Table>
          <THead>
            <tr>
              <TH className="w-[14%]">SKU</TH>
              <TH className="w-[22%]">名稱</TH>
              <TH className="w-[10%]">類型</TH>
              <TH className="w-[12%]">分類</TH>
              <TH className="w-[8%]">單位</TH>
              {!isMaterial && <TH className="w-[10%] text-right">售價</TH>}
              <TH className="w-[10%] text-right">標準成本</TH>
              <TH className="w-[8%]">庫管</TH>
              {canManage && <TH className="w-[16%]">操作</TH>}
            </tr>
          </THead>
          <tbody>
            {items.map((it) => (
              <TR key={it.id}>
                <TD className="truncate font-mono text-xs" title={it.sku}>
                  {it.sku}
                </TD>
                <TD className="font-medium text-gray-900">
                  <span className="line-clamp-2 whitespace-normal">{it.name}</span>
                </TD>
                <TD>
                  <Badge color="blue">{ITEM_TYPE_LABELS[it.type]}</Badge>
                </TD>
                <TD className="truncate">{it.category?.name ?? "—"}</TD>
                <TD className="whitespace-nowrap">{it.baseUnit.name}</TD>
                {!isMaterial && (
                  <TD className="whitespace-nowrap text-right">{formatTWD(it.price)}</TD>
                )}
                <TD className="whitespace-nowrap text-right font-medium text-gray-900">
                  {formatTWD(it.standardCost)}
                </TD>
                <TD>
                  {it.trackStock ? <Badge color="green">管理</Badge> : <Badge>不管理</Badge>}
                </TD>
                {canManage && (
                  <TD className="whitespace-nowrap">
                    <ItemActions item={it} canManage={canManage} from={from} />
                  </TD>
                )}
              </TR>
            ))}
          </tbody>
        </Table>
      </div>
    </>
  );
}
