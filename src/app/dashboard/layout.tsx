import { redirect } from "next/navigation";
import { getActor } from "@/lib/permissions";
import { signOut } from "@/lib/auth";
import { NAV_ITEMS } from "@/components/layout/nav";
import { AppShell } from "@/components/layout/app-shell";
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

  async function handleSignOut() {
    "use server";
    await signOut({ redirectTo: "/login" });
  }

  return (
    <AppShell
      items={items}
      userName={actor.name}
      roleLabels={roleLabels(actor.roles)}
      signOutAction={handleSignOut}
    >
      {children}
    </AppShell>
  );
}
