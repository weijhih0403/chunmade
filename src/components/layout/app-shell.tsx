"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { NavItem } from "./nav";
import { BrandMark } from "./brand-mark";
import { NavIcon, SidebarToggleIcon } from "./nav-icons";

const COLLAPSE_KEY = "erp-sidebar-collapsed";

function isActive(pathname: string, href: string) {
  return pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
}

function groupItems(items: NavItem[]) {
  return items.reduce<Record<string, NavItem[]>>((acc, item) => {
    (acc[item.group] ??= []).push(item);
    return acc;
  }, {});
}

function NavLinks({
  items,
  collapsed,
  onNavigate,
}: {
  items: NavItem[];
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const groups = groupItems(items);

  if (collapsed) {
    return (
      <nav className="flex flex-1 flex-col overflow-y-auto px-2 py-2">
        {Object.entries(groups).map(([group, groupItems], groupIndex) => (
          <div key={group} className={cn(groupIndex > 0 && "mt-1 border-t border-gray-100 pt-1")}>
            {groupItems.map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  title={item.label}
                  aria-label={item.label}
                  className={cn(
                    "group relative mx-auto mb-0.5 flex h-10 w-10 items-center justify-center rounded-xl transition-colors",
                    active
                      ? "bg-amber-100 text-amber-800 shadow-sm ring-1 ring-amber-200/80"
                      : "text-gray-500 hover:bg-gray-100 hover:text-gray-800",
                  )}
                >
                  {active && (
                    <span className="absolute -left-2 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-amber-500" />
                  )}
                  <NavIcon href={item.href} />
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
    );
  }

  return (
    <nav className="flex-1 overflow-y-auto px-2 py-3">
      {Object.entries(groups).map(([group, groupItems]) => (
        <div key={group} className="mb-4">
          <p className="px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">
            {group}
          </p>
          {groupItems.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                className={cn(
                  "mb-0.5 flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors",
                  active
                    ? "bg-amber-100 font-medium text-amber-900"
                    : "text-gray-700 hover:bg-gray-100",
                )}
              >
                <NavIcon href={item.href} className={cn(active ? "text-amber-700" : "text-gray-400")} />
                {item.label}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

function currentPageLabel(pathname: string, items: NavItem[]) {
  const match = items
    .filter((item) => isActive(pathname, item.href))
    .sort((a, b) => b.href.length - a.href.length)[0];
  return match?.label ?? "淳手作管理系統";
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
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(COLLAPSE_KEY);
    if (saved === "1") setCollapsed(true);
  }, []);

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0");
      return next;
    });
  }

  const pageTitle = currentPageLabel(pathname, items);

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <aside
        className={cn(
          "hidden h-screen shrink-0 flex-col border-r border-gray-200 bg-white transition-[width] duration-200 md:flex",
          collapsed ? "w-16" : "w-56",
        )}
      >
        <div
          className={cn(
            "flex shrink-0 border-b border-gray-100",
            collapsed
              ? "flex-col items-center gap-2 px-2 py-3"
              : "h-14 items-center justify-between gap-2 px-3",
          )}
        >
          <BrandMark collapsed={collapsed} showSystemTitle />
          <button
            type="button"
            onClick={toggleCollapsed}
            className={cn(
              "flex shrink-0 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-amber-50 hover:text-amber-800",
              collapsed ? "h-8 w-8" : "h-8 w-8",
            )}
            aria-label={collapsed ? "展開選單" : "收合選單"}
            title={collapsed ? "展開選單" : "收合選單"}
          >
            <SidebarToggleIcon collapsed={collapsed} />
          </button>
        </div>
        <NavLinks items={items} collapsed={collapsed} />
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setMobileOpen(false)}
            aria-hidden
          />
          <aside className="absolute left-0 top-0 flex h-full w-64 max-w-[80%] flex-col border-r border-gray-200 bg-white shadow-xl">
            <div className="flex h-14 items-center justify-between border-b border-gray-100 px-4">
              <BrandMark showSystemTitle />
              <button
                type="button"
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

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-gray-200 bg-white px-4 md:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="rounded p-1 text-gray-600 hover:bg-gray-100 md:hidden"
              aria-label="開啟選單"
            >
              <span className="text-lg leading-none">☰</span>
            </button>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-gray-900">{pageTitle}</p>
              <p className="hidden truncate text-xs text-gray-400 sm:block">淳手作管理系統</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-3 sm:gap-4">
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
        <main className="flex-1 overflow-y-auto p-4 md:p-5 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
