import { RoleName } from "@prisma/client";
import { requirePermission, companyScope } from "@/lib/permissions";
import { prisma } from "@/lib/db";
import { ROLE_LABELS } from "@/lib/constants";
import { formatDateTime } from "@/lib/dates";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import { approveUserAction, rejectUserAction } from "@/modules/users/actions";

export const dynamic = "force-dynamic";

export default async function ReviewUsersPage() {
  const actor = await requirePermission("user.approve");
  const scope = companyScope(actor);

  const pendingUsers = await prisma.user.findMany({
    where: { status: "PENDING", OR: [{ companyId: scope.companyId }, { companyId: null }] },
    orderBy: { appliedAt: "asc" },
  });

  const assignableRoles = Object.values(RoleName);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">帳號審核</h1>
        <p className="text-sm text-gray-500">審核待核准的帳號申請；未核准帳號無法登入系統。</p>
      </div>

      {pendingUsers.length === 0 ? (
        <Card>
          <CardContent>
            <p className="py-8 text-center text-sm text-gray-400">目前沒有待審核的帳號申請。</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {pendingUsers.map((u) => (
            <Card key={u.id}>
              <CardHeader>
                <CardTitle>
                  {u.name}（{u.email}）
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="mb-3 text-xs text-gray-400">
                  申請時間：{formatDateTime(u.appliedAt)}
                </p>
                <div className="flex flex-wrap items-end gap-3">
                  <form action={approveUserAction} className="flex items-end gap-2">
                    <input type="hidden" name="userId" value={u.id} />
                    <div>
                      <label className="mb-1 block text-xs text-gray-500">指派角色</label>
                      <Select name="role" defaultValue="STAFF" className="w-40">
                        {assignableRoles.map((r) => (
                          <option key={r} value={r}>
                            {ROLE_LABELS[r]}
                          </option>
                        ))}
                      </Select>
                    </div>
                    <Button type="submit" variant="primary">
                      核准
                    </Button>
                  </form>

                  <form action={rejectUserAction} className="flex items-end gap-2">
                    <input type="hidden" name="userId" value={u.id} />
                    <Button type="submit" variant="danger">
                      拒絕
                    </Button>
                  </form>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
