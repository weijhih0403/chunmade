import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/permissions";
import { getCustomer } from "@/modules/crm/service";
import { adjustPointsAction, topUpStoredValueAction } from "@/modules/crm/actions";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, THead, TH, TR, TD, EmptyState } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatTWD } from "@/lib/money";
import { formatDateTime } from "@/lib/dates";

export const dynamic = "force-dynamic";

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const actor = await requirePermission("customer.read");
  const customer = await getCustomer(actor, id);
  if (!customer) notFound();

  const canManage = actor.permissions.has("customer.manage");
  const member = customer.member;

  return (
    <div className="space-y-6">
      <PageHeader
        title={customer.name}
        description={customer.phone ?? "—"}
      />

      {member ? (
        <>
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardContent>
                <p className="text-sm text-gray-500">會員點數</p>
                <p className="text-2xl font-bold">{member.points}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent>
                <p className="text-sm text-gray-500">儲值金餘額</p>
                <p className="text-2xl font-bold">{formatTWD(member.storedValue)}</p>
              </CardContent>
            </Card>
          </div>

          {canManage && (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>調整點數</CardTitle>
                </CardHeader>
                <CardContent>
                  <form action={adjustPointsAction} className="flex items-end gap-2">
                    <input type="hidden" name="customerId" value={customer.id} />
                    <div>
                      <label className="mb-1 block text-xs text-gray-500">點數（可負）</label>
                      <Input name="points" type="number" className="w-28" required />
                    </div>
                    <Input name="note" placeholder="備註" className="w-36" />
                    <Button type="submit">送出</Button>
                  </form>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>儲值</CardTitle>
                </CardHeader>
                <CardContent>
                  <form action={topUpStoredValueAction} className="flex items-end gap-2">
                    <input type="hidden" name="customerId" value={customer.id} />
                    <div>
                      <label className="mb-1 block text-xs text-gray-500">金額</label>
                      <Input name="amount" type="number" step="0.01" className="w-32" required />
                    </div>
                    <Button type="submit">儲值</Button>
                  </form>
                </CardContent>
              </Card>
            </div>
          )}

          <Card>
            <CardHeader>
              <CardTitle>點數異動紀錄</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <THead>
                  <tr>
                    <TH>時間</TH>
                    <TH>類型</TH>
                    <TH className="text-right">異動</TH>
                    <TH className="text-right">餘額</TH>
                    <TH>備註</TH>
                  </tr>
                </THead>
                <tbody>
                  {member.loyaltyTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={5}>
                        <EmptyState message="尚無紀錄。" />
                      </td>
                    </tr>
                  ) : (
                    member.loyaltyTransactions.map((t) => (
                      <TR key={t.id}>
                        <TD className="text-xs text-gray-500">{formatDateTime(t.createdAt)}</TD>
                        <TD>{t.type}</TD>
                        <TD className="text-right">{t.points}</TD>
                        <TD className="text-right">{t.balanceAfter}</TD>
                        <TD className="text-xs text-gray-500">{t.note ?? "—"}</TD>
                      </TR>
                    ))
                  )}
                </tbody>
              </Table>
            </CardContent>
          </Card>
        </>
      ) : (
        <Card>
          <CardContent>
            <p className="text-sm text-gray-500">此客戶尚未加入會員。</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
