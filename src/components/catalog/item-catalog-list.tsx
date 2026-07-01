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
  supplier: { name: string } | null;
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
          <p className="truncate font-medium text-gray-900">{item.name}</p>
          <p className="mt-0.5 truncate font-mono text-xs text-gray-400">{item.sku}</p>
        </div>
        <Badge color="blue">{ITEM_TYPE_LABELS[item.type]}</Badge>
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        <div className="min-w-0">
          <dt className="text-xs text-gray-400">分類</dt>
          <dd className="truncate text-gray-700">{item.category?.name ?? "—"}</dd>
        </div>
        <div className="min-w-0">
          <dt className="text-xs text-gray-400">單位</dt>
          <dd className="truncate text-gray-700">{item.baseUnit.name}</dd>
        </div>
        {isMaterial && (
          <div className="col-span-2 min-w-0">
            <dt className="text-xs text-gray-400">供應商</dt>
            <dd className="truncate text-gray-700">{item.supplier?.name ?? "—"}</dd>
          </div>
        )}
        <div className={isMaterial ? "col-span-2 min-w-0" : "min-w-0"}>
          <dt className="text-xs text-gray-400">{isMaterial ? "標準成本" : "售價"}</dt>
          <dd className="truncate font-medium text-gray-900">
            {formatTWD(isMaterial ? item.standardCost : item.price)}
          </dd>
        </div>
        {!isMaterial && (
          <div className="min-w-0">
            <dt className="text-xs text-gray-400">標準成本</dt>
            <dd className="truncate text-gray-700">{formatTWD(item.standardCost)}</dd>
          </div>
        )}
        <div className="min-w-0">
          <dt className="text-xs text-gray-400">庫存</dt>
          <dd className="whitespace-nowrap">
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
        <Table className="min-w-[56rem] md:table-auto">
          <THead>
            <tr>
              <TH>SKU</TH>
              <TH>名稱</TH>
              <TH>類型</TH>
              <TH>分類</TH>
              {isMaterial && <TH>供應商</TH>}
              <TH>單位</TH>
              {!isMaterial && <TH className="text-right">售價</TH>}
              <TH className="text-right">標準成本</TH>
              <TH>庫管</TH>
              {canManage && <TH>操作</TH>}
            </tr>
          </THead>
          <tbody>
            {items.map((it) => (
              <TR key={it.id}>
                <TD className="max-w-[12rem] truncate font-mono text-xs" title={it.sku}>
                  {it.sku}
                </TD>
                <TD className="max-w-[14rem] truncate font-medium text-gray-900" title={it.name}>
                  {it.name}
                </TD>
                <TD className="whitespace-nowrap">
                  <Badge color="blue">{ITEM_TYPE_LABELS[it.type]}</Badge>
                </TD>
                <TD className="max-w-[10rem] truncate" title={it.category?.name ?? undefined}>
                  {it.category?.name ?? "—"}
                </TD>
                {isMaterial && (
                  <TD className="max-w-[12rem] truncate" title={it.supplier?.name ?? undefined}>
                    {it.supplier?.name ?? "—"}
                  </TD>
                )}
                <TD className="whitespace-nowrap">{it.baseUnit.name}</TD>
                {!isMaterial && (
                  <TD className="whitespace-nowrap text-right">{formatTWD(it.price)}</TD>
                )}
                <TD className="whitespace-nowrap text-right font-medium text-gray-900">
                  {formatTWD(it.standardCost)}
                </TD>
                <TD className="whitespace-nowrap">
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
