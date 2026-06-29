import { signOut } from "@/lib/auth";
import { Button } from "@/components/ui/button";

export function Topbar({
  userName,
  roleLabels,
}: {
  userName: string;
  roleLabels: string;
}) {
  return (
    <header className="flex h-14 items-center justify-between border-b border-gray-200 bg-white px-6">
      <div className="text-sm text-gray-500">淳手作門市管理</div>
      <div className="flex items-center gap-4">
        <div className="text-right">
          <p className="text-sm font-medium text-gray-800">{userName}</p>
          <p className="text-xs text-gray-400">{roleLabels}</p>
        </div>
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/login" });
          }}
        >
          <Button variant="outline" size="sm" type="submit">
            登出
          </Button>
        </form>
      </div>
    </header>
  );
}
