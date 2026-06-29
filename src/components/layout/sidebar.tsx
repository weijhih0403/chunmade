"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";
import type { NavItem } from "./nav";

export function Sidebar({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  const groups = items.reduce<Record<string, NavItem[]>>((acc, item) => {
    (acc[item.group] ??= []).push(item);
    return acc;
  }, {});

  return (
    <aside
      className={cn(
        "flex h-screen flex-col border-r border-gray-200 bg-white transition-all",
        collapsed ? "w-16" : "w-60",
      )}
    >
      <div className="flex h-14 items-center justify-between border-b border-gray-100 px-4">
        {!collapsed && <span className="font-bold text-amber-800">淳手作 ERP</span>}
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="rounded p-1 text-gray-500 hover:bg-gray-100"
          aria-label="收合選單"
        >
          {collapsed ? "»" : "«"}
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-3">
        {Object.entries(groups).map(([group, groupItems]) => (
          <div key={group} className="mb-4">
            {!collapsed && (
              <p className="px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">
                {group}
              </p>
            )}
            {groupItems.map((item) => {
              const active =
                pathname === item.href ||
                (item.href !== "/dashboard" && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "mb-0.5 block rounded-lg px-3 py-2 text-sm transition-colors",
                    active
                      ? "bg-amber-100 font-medium text-amber-900"
                      : "text-gray-700 hover:bg-gray-100",
                  )}
                  title={item.label}
                >
                  {collapsed ? item.label.charAt(0) : item.label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
    </aside>
  );
}
