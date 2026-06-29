import { redirect } from "next/navigation";
import { getActor } from "@/lib/permissions";
import { NAV_ITEMS } from "@/components/layout/nav";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { roleLabels } from "@/lib/constants";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const actor = await getActor();
  if (!actor) redirect("/login");

  const items = NAV_ITEMS.filter(
    (item) => !item.permission || actor.permissions.has(item.permission),
  );

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar items={items} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar userName={actor.name} roleLabels={roleLabels(actor.roles)} />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
