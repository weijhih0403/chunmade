import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { setUserStatus } from "./actions";

export default async function ReviewUsersPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if (!session.user.isAdmin) redirect("/dashboard");

  const users = await prisma.user.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    select: {
      id: true,
      username: true,
      status: true,
      isAdmin: true,
      createdAt: true,
      approvedAt: true,
    },
  });

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl text-[var(--foreground)]">員工審核</h1>
      <div className="overflow-x-auto rounded-2xl border border-[var(--stroke)] bg-[var(--elevated)]">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="border-b border-[var(--stroke)] bg-[var(--surface)]">
            <tr className="text-left text-[var(--muted)]">
              <th className="px-4 py-3 font-medium">帳號</th>
              <th className="px-4 py-3 font-medium">狀態</th>
              <th className="px-4 py-3 font-medium">建立時間</th>
              <th className="px-4 py-3 font-medium">核准時間</th>
              <th className="px-4 py-3 font-medium">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--stroke)]">
            {users.map((u) => (
              <tr key={u.id}>
                <td className="px-4 py-3 font-medium text-[var(--foreground)]">
                  {u.username}
                  {u.isAdmin ? (
                    <span className="ml-2 rounded-full bg-[var(--surface)] px-2 py-0.5 text-xs text-[var(--muted)]">
                      管理者
                    </span>
                  ) : null}
                </td>
                <td className="px-4 py-3">{u.status}</td>
                <td className="px-4 py-3 text-[var(--muted)]">
                  {u.createdAt.toLocaleString("zh-TW")}
                </td>
                <td className="px-4 py-3 text-[var(--muted)]">
                  {u.approvedAt ? u.approvedAt.toLocaleString("zh-TW") : "—"}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    <form
                      action={async () => {
                        "use server";
                        await setUserStatus(u.id, "APPROVED");
                      }}
                    >
                      <button className="rounded-full border border-emerald-600/40 px-3 py-1 text-xs text-emerald-700 hover:bg-emerald-500/10 dark:text-emerald-300">
                        通過
                      </button>
                    </form>
                    <form
                      action={async () => {
                        "use server";
                        await setUserStatus(u.id, "REJECTED");
                      }}
                    >
                      <button className="rounded-full border border-red-500/40 px-3 py-1 text-xs text-red-600 hover:bg-red-500/10 dark:text-red-300">
                        拒絕
                      </button>
                    </form>
                    <form
                      action={async () => {
                        "use server";
                        await setUserStatus(u.id, "PENDING");
                      }}
                    >
                      <button className="rounded-full border border-[var(--stroke)] px-3 py-1 text-xs text-[var(--muted)] hover:border-[var(--accent)]">
                        改回待審
                      </button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
