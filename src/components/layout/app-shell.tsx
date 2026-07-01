"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { NavItem } from "./nav";
import { BrandMark } from "./brand-mark";

const COLLAPSE_KEY = "erp-sidebar-collapsed";

function isActive(pathname: string, href: string) {
  return pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
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

  if (collapsed) {
    return (
      <nav className="flex flex-1 flex-col items-center gap-0.5 overflow-y-auto px-1 py-2">
        {items.map((item) => {
          const active = isActive(pathname, item.href);
          const short = item.shortLabel ?? item.label.slice(0, 1);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              title={item.label}
              className={cn(
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[10px] font-semibold leading-none transition-colors",
                short.length > 1 && "text-[9px]",
                active
                  ? "bg-amber-100 text-amber-900 ring-1 ring-amber-200"
                  : "text-gray-600 hover:bg-gray-100",
              )}
            >
              {short}
            </Link>
          );
        })}
      </nav>
    );
  }

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
            const active = isActive(pathname, item.href);
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

function currentPageLabel(pathname: string, items: NavItem[]) {
  const match = items
    .filter((item) => isActive(pathname, item.href))
    .sort((a, b) => b.href.length - a.href.length)[0];
  return match?.label ?? "淳手作門市管理";
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
          collapsed ? "w-[3.25rem]" : "w-56",
        )}
      >
        <div
          className={cn(
            "flex border-b border-gray-100",
            collapsed
              ? "flex-col items-center gap-1 py-2"
              : "h-14 items-center justify-between gap-2 px-3",
          )}
        >
          <BrandMark collapsed={collapsed} />
          <button
            type="button"
            onClick={toggleCollapsed}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-lg leading-none text-gray-500 hover:bg-gray-100"
            aria-label={collapsed ? "展開選單" : "收合選單"}
            title={collapsed ? "展開選單" : "收合選單"}
          >
            {collapsed ? "»" : "«"}
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
              <BrandMark />
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
              <p className="hidden truncate text-xs text-gray-400 sm:block">淳手作門市管理</p>
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
