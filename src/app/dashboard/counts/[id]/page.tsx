import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/permissions";
import { getCount } from "@/modules/inventory/service";
import { completeCountAction } from "@/modules/inventory/count-actions";
import { BackButton } from "@/components/layout/back-button";
import { PageHeader } from "@/components/layout/page-header";
import { Table, THead, TH, TR, TD, Badge } from "@/components/ui/table";
import { SubmitButton } from "@/components/ui/submit-button";

export const dynamic = "force-dynamic";

export default async function CountDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const actor = await requirePermission("inventory.count");
  const data = await getCount(actor, id);
  if (!data) notFound();

  const { count, rows } = data;
  const editable = count.status === "COUNTING";

  return (
    <div className="space-y-4">
      <BackButton fallbackHref="/dashboard/counts" />

      <PageHeader
        title={`盤點單 ${count.countNo}`}
        description={editable ? "輸入實盤數量後送出，系統會自動產生差異調整" : "盤點已完成"}
        action={<Badge color={editable ? "amber" : "green"}>{editable ? "盤點中" : "已完成"}</Badge>}
      />

      <form action={completeCountAction}>
        <input type="hidden" name="countId" value={count.id} />
        <Table>
          <THead>
            <tr>
              <TH>商品</TH>
              <TH className="text-right">系統數量</TH>
              <TH className="text-right">實盤數量</TH>
              <TH className="text-right">差異</TH>
            </tr>
          </THead>
          <tbody>
            {rows.map((r) => (
              <TR key={r.id}>
                <TD className="font-medium text-gray-900">
                  {r.itemName}
                  <span className="ml-1 text-xs text-gray-400">{r.unit}</span>
                </TD>
                <TD className="text-right">{r.systemQty.toString()}</TD>
                <TD className="text-right">
                  {editable ? (
                    <input
                      name={`counted_${r.itemId}`}
                      type="number"
                      step="0.0001"
                      defaultValue={r.countedQty.toString()}
                      className="h-9 w-28 rounded border border-gray-300 px-2 text-right"
                    />
                  ) : (
                    r.countedQty.toString()
                  )}
                </TD>
                <TD
                  className={`text-right ${
                    r.differenceQty.greaterThan(0)
                      ? "text-green-600"
                      : r.differenceQty.lessThan(0)
                        ? "text-red-600"
                        : "text-gray-400"
                  }`}
                >
                  {r.differenceQty.toString()}
                </TD>
              </TR>
            ))}
          </tbody>
        </Table>

        {editable && (
          <div className="mt-4">
            <SubmitButton pendingText="處理中…">完成盤點並產生差異調整</SubmitButton>
          </div>
        )}
      </form>
    </div>
  );
}
