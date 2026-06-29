import Link from "next/link";
import { requirePermission } from "@/lib/permissions";
import { listProductionOrders } from "@/modules/production/service";
import { PageHeader } from "@/components/layout/page-header";
import { Table, THead, TH, TR, TD, EmptyState, Badge } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { formatTWD } from "@/lib/money";

export const dynamic = "force-dynamic";

const STATUS: Record<string, { label: string; color: "gray" | "amber" | "blue" | "green" | "red" }> = {
  DRAFT: { label: "草稿", color: "gray" },
  RELEASED: { label: "已下達", color: "blue" },
  IN_PROGRESS: { label: "生產中", color: "amber" },
  COMPLETED: { label: "已完工", color: "green" },
  CANCELLED: { label: "已取消", color: "red" },
};

export default async function ProductionPage() {
  const actor = await requirePermission("production.read");
  const orders = await listProductionOrders(actor);
  const canManage = actor.permissions.has("production.manage");

  return (
    <div>
      <PageHeader
        title="生產單"
        description="領料製作 → 完工入庫"
        action={
          canManage ? (
            <Link href="/dashboard/production/new">
              <Button>新增生產單</Button>
            </Link>
          ) : null
        }
      />
      {orders.length === 0 ? (
        <EmptyState message="尚無生產單。" />
      ) : (
        <Table>
          <THead>
            <tr>
              <TH>單號</TH>
              <TH>產出品項</TH>
              <TH className="text-right">計畫產量</TH>
              <TH className="text-right">實際產量</TH>
              <TH className="text-right">生產成本</TH>
              <TH>狀態</TH>
              <TH></TH>
            </tr>
          </THead>
          <tbody>
            {orders.map((o) => (
              <TR key={o.id}>
                <TD className="font-mono text-xs">{o.orderNo}</TD>
                <TD className="font-medium text-gray-900">{o.productName}</TD>
                <TD className="text-right">{o.plannedQty.toString()}</TD>
                <TD className="text-right">{o.producedQty.toString()}</TD>
                <TD className="text-right">{formatTWD(o.totalCost)}</TD>
                <TD>
                  <Badge color={STATUS[o.status]?.color ?? "gray"}>
                    {STATUS[o.status]?.label ?? o.status}
                  </Badge>
                </TD>
                <TD>
                  <Link
                    href={`/dashboard/production/${o.id}`}
                    className="text-amber-700 hover:underline"
                  >
                    開啟
                  </Link>
                </TD>
              </TR>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
}
