import Link from "next/link";
import { requirePermission } from "@/lib/permissions";
import { listCustomers } from "@/modules/crm/service";
import { PageHeader } from "@/components/layout/page-header";
import { Table, THead, TH, TR, TD, EmptyState, Badge } from "@/components/ui/table";
import { formatTWD } from "@/lib/money";

export const dynamic = "force-dynamic";

export default async function CustomersPage() {
  const actor = await requirePermission("customer.read");
  const customers = await listCustomers(actor);

  return (
    <div className="space-y-4">
      <PageHeader title="客戶 / 會員" description="客戶資料、會員點數與儲值金" />

      {customers.length === 0 ? (
        <EmptyState message="尚無客戶。" />
      ) : (
        <Table>
          <THead>
            <tr>
              <TH>姓名</TH>
              <TH>電話</TH>
              <TH>會員編號</TH>
              <TH className="text-right">點數</TH>
              <TH className="text-right">儲值金</TH>
              <TH></TH>
            </tr>
          </THead>
          <tbody>
            {customers.map((c) => (
              <TR key={c.id}>
                <TD className="font-medium text-gray-900">{c.name}</TD>
                <TD>{c.phone ?? "—"}</TD>
                <TD>
                  {c.member ? (
                    <Badge color="blue">{c.member.memberNo}</Badge>
                  ) : (
                    <span className="text-gray-400">非會員</span>
                  )}
                </TD>
                <TD className="text-right">{c.member?.points ?? "—"}</TD>
                <TD className="text-right">
                  {c.member ? formatTWD(c.member.storedValue) : "—"}
                </TD>
                <TD>
                  <Link
                    href={`/dashboard/customers/${c.id}`}
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
