import Link from "next/link";
import { requirePermission } from "@/lib/permissions";
import { listCounts, listWarehouses } from "@/modules/inventory/service";
import { createCountAction, deleteCountAction } from "@/modules/inventory/count-actions";
import { PageHeader } from "@/components/layout/page-header";
import { SuccessBanner } from "@/components/ui/success-banner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, THead, TH, TR, TD, EmptyState, Badge } from "@/components/ui/table";
import { SubmitButton } from "@/components/ui/submit-button";
import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";
import { Select } from "@/components/ui/input";
import { formatDateTime } from "@/lib/dates";

export const dynamic = "force-dynamic";

const STATUS: Record<string, { label: string; color: "gray" | "amber" | "green" | "red" }> = {
  DRAFT: { label: "草稿", color: "gray" },
  COUNTING: { label: "盤點中", color: "amber" },
  COMPLETED: { label: "已完成", color: "green" },
  CANCELLED: { label: "已取消", color: "red" },
};

export default async function CountsPage({
  searchParams,
}: {
  searchParams: Promise<{ completed?: string }>;
}) {
  const { completed } = await searchParams;
  const actor = await requirePermission("inventory.count");
  const [counts, warehouses] = await Promise.all([listCounts(actor), listWarehouses(actor)]);
  const whName = new Map(warehouses.map((w) => [w.id, w.name]));

  return (
    <div className="space-y-6">
      <PageHeader title="庫存盤點" description="各門市盤點實際庫存與叫貨數量（僅含原物料與半成品）" />

      {completed === "1" && (
        <SuccessBanner message="盤點已完成，庫存已依實盤數量更新。" />
      )}

      <Card>
        <CardHeader>
          <CardTitle>新增盤點單</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            action={createCountAction}
            className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:gap-2"
          >
            <div className="w-full sm:w-auto">
              <label className="mb-1 block text-xs text-gray-500">倉庫</label>
              <Select name="warehouseId" required defaultValue="" className="w-full sm:w-48">
                <option value="" disabled>
                  請選擇
                </option>
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </Select>
            </div>
            <SubmitButton pendingText="建立中…" className="w-full sm:w-auto">
              建立並開始盤點
            </SubmitButton>
          </form>
        </CardContent>
      </Card>

      <Table>
        <THead>
          <tr>
            <TH>單號</TH>
            <TH>倉庫</TH>
            <TH>狀態</TH>
            <TH>建立時間</TH>
            <TH></TH>
          </tr>
        </THead>
        <tbody>
          {counts.length === 0 ? (
            <tr>
              <td colSpan={5}>
                <EmptyState message="尚無盤點單。" />
              </td>
            </tr>
          ) : (
            counts.map((c) => (
              <TR key={c.id}>
                <TD className="font-mono text-xs">{c.countNo}</TD>
                <TD>{whName.get(c.warehouseId) ?? c.warehouseId}</TD>
                <TD>
                  <Badge color={STATUS[c.status]?.color ?? "gray"}>
                    {STATUS[c.status]?.label ?? c.status}
                  </Badge>
                </TD>
                <TD className="text-xs text-gray-500">{formatDateTime(c.createdAt)}</TD>
                <TD>
                  <div className="flex items-center gap-3">
                    <Link
                      href={`/dashboard/counts/${c.id}`}
                      className="text-amber-700 hover:underline"
                    >
                      開啟
                    </Link>
                    {c.status !== "COMPLETED" && (
                      <form action={deleteCountAction}>
                        <input type="hidden" name="countId" value={c.id} />
                        <ConfirmSubmitButton
                          variant="ghost"
                          size="sm"
                          pendingText="刪除中…"
                          confirmMessage={`確定要刪除盤點單 ${c.countNo}？`}
                        >
                          <span className="text-red-600">刪除</span>
                        </ConfirmSubmitButton>
                      </form>
                    )}
                  </div>
                </TD>
              </TR>
            ))
          )}
        </tbody>
      </Table>
    </div>
  );
}
