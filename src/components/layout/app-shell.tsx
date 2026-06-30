"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { NavItem } from "./nav";

function NavLinks({
  items,
  onNavigate,
}: {
  items: NavItem[];
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  const groups = items.reduce<Record<string, NavItem[]>>((acc, item) => {
    (acc[item.group] ??= []).push(item);
    return acc;
  }, {});

  return (
    <nav className="flex-1 overflow-y-auto px-2 py-3">
      {Object.entries(groups).map(([group, groupItems]) => (
        <div key={group} className="mb-4">
          <p className="px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">
            {group}
          </p>
          {groupItems.map((item) => {
            const active =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                className={cn(
                  "mb-0.5 block rounded-lg px-3 py-2 text-sm transition-colors",
                  active
                    ? "bg-amber-100 font-medium text-amber-900"
                    : "text-gray-700 hover:bg-gray-100",
                )}
                title={item.label}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

export function AppShell({
  items,
  userName,
  roleLabels,
  signOutAction,
  children,
}: {
  items: NavItem[];
  userName: string;
  roleLabels: string;
  signOutAction: () => Promise<void>;
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* 桌機固定側欄（md 以上顯示） */}
      <aside
        className={cn(
          "hidden h-screen flex-col border-r border-gray-200 bg-white transition-all md:flex",
          collapsed ? "w-16" : "w-60",
        )}
      >
        <div className="flex h-14 items-center justify-between border-b border-gray-100 px-4">
          {!collapsed && <span className="font-bold text-amber-800">淳手作 ERP</span>}
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-2xl leading-none text-gray-600 hover:bg-gray-100"
            aria-label="收合選單"
          >
            {collapsed ? "»" : "«"}
          </button>
        </div>
        {!collapsed && <NavLinks items={items} />}
      </aside>

      {/* 手機/平板抽屜選單 */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setMobileOpen(false)}
            aria-hidden
          />
          <aside className="absolute left-0 top-0 flex h-full w-64 max-w-[80%] flex-col border-r border-gray-200 bg-white shadow-xl">
            <div className="flex h-14 items-center justify-between border-b border-gray-100 px-4">
              <span className="font-bold text-amber-800">淳手作 ERP</span>
              <button
                onClick={() => setMobileOpen(false)}
                className="rounded p-1 text-gray-500 hover:bg-gray-100"
                aria-label="關閉選單"
              >
                ✕
              </button>
            </div>
            <NavLinks items={items} onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-14 items-center justify-between border-b border-gray-200 bg-white px-4 md:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="rounded p-1 text-gray-600 hover:bg-gray-100 md:hidden"
              aria-label="開啟選單"
            >
              <span className="text-lg leading-none">☰</span>
            </button>
            <div className="truncate text-sm text-gray-500">淳手作門市管理</div>
          </div>
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="text-right">
              <p className="text-sm font-medium text-gray-800">{userName}</p>
              <p className="hidden text-xs text-gray-400 sm:block">{roleLabels}</p>
            </div>
            <form action={signOutAction}>
              <Button variant="outline" size="sm" type="submit">
                登出
              </Button>
            </form>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
