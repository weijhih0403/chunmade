import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

function Icon({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("h-5 w-5 shrink-0", className)}
      aria-hidden
    >
      {children}
    </svg>
  );
}

const ICONS: Record<string, ReactNode> = {
  "/dashboard": (
  <>
    <rect x="3" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" />
    <rect x="14" y="14" width="7" height="7" rx="1" />
  </>
  ),
  "/dashboard/pos-orders": (
    <>
      <path d="M6 6h12l-1.5 9H7.5L6 6Z" />
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </>
  ),
  "/dashboard/items": (
    <>
      <path d="M21 8v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8" />
      <path d="M3 8h18l-2-4H5L3 8Z" />
      <path d="M10 12v4" />
      <path d="M14 12v4" />
    </>
  ),
  "/dashboard/materials": (
    <>
      <path d="M12 3 3 8l9 5 9-5-9-5Z" />
      <path d="M3 12l9 5 9-5" />
      <path d="M3 16l9 5 9-5" />
    </>
  ),
  "/dashboard/categories": (
    <>
      <path d="M4 6h16" />
      <path d="M4 12h10" />
      <path d="M4 18h14" />
      <circle cx="19" cy="12" r="1.5" fill="currentColor" stroke="none" />
    </>
  ),
  "/dashboard/units": (
    <>
      <path d="M4 20V4" />
      <path d="M4 20h16" />
      <path d="M8 16V8" />
      <path d="M12 16V10" />
      <path d="M16 16V6" />
    </>
  ),
  "/dashboard/suppliers": (
    <>
      <path d="M3 7h11v10H3z" />
      <path d="M14 10h4l3 3v4h-7V10Z" />
      <circle cx="7.5" cy="17.5" r="1.5" />
      <circle cx="17.5" cy="17.5" r="1.5" />
    </>
  ),
  "/dashboard/inventory": (
    <>
      <path d="M3 9h18v11H3z" />
      <path d="M7 9V6a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v3" />
      <path d="M9 14h6" />
    </>
  ),
  "/dashboard/transfers": (
    <>
      <path d="M7 7h11" />
      <path d="M15 4l3 3-3 3" />
      <path d="M17 17H6" />
      <path d="M9 20l-3-3 3-3" />
    </>
  ),
  "/dashboard/counts": (
    <>
      <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
      <rect x="9" y="3" width="6" height="4" rx="1" />
      <path d="M9 14l2 2 4-4" />
    </>
  ),
  "/dashboard/purchases": (
    <>
      <path d="M6 6h15l-1.5 9H7.5L6 6Z" />
      <path d="M6 6 5 3H2" />
      <circle cx="9" cy="20" r="1" />
      <circle cx="18" cy="20" r="1" />
    </>
  ),
  "/dashboard/recipes": (
    <>
      <path d="M6 4h9a3 3 0 0 1 3 3v13H6z" />
      <path d="M6 8h12" />
      <path d="M9 12h6" />
      <path d="M9 16h4" />
    </>
  ),
  "/dashboard/production": (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v2" />
      <path d="M12 20v2" />
      <path d="m4.93 4.93 1.41 1.41" />
      <path d="m17.66 17.66 1.41 1.41" />
      <path d="M2 12h2" />
      <path d="M20 12h2" />
      <path d="m4.93 19.07 1.41-1.41" />
      <path d="m17.66 6.34 1.41-1.41" />
    </>
  ),
  "/dashboard/employees": (
    <>
      <circle cx="9" cy="8" r="3" />
      <path d="M3 20v-1a5 5 0 0 1 5-5h2a5 5 0 0 1 5 5v1" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M14 20v-.5a3.5 3.5 0 0 1 3.5-3.5h.5" />
    </>
  ),
  "/dashboard/schedule": (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M16 3v4" />
      <path d="M8 3v4" />
      <path d="M3 11h18" />
      <path d="M8 15h2" />
      <path d="M14 15h2" />
    </>
  ),
  "/dashboard/reports": (
    <>
      <path d="M4 20V10" />
      <path d="M10 20V4" />
      <path d="M16 20v-7" />
      <path d="M22 20H2" />
    </>
  ),
  "/dashboard/org": (
    <>
      <path d="M4 21V9l8-5 8 5v12" />
      <path d="M9 21v-6h6v6" />
      <path d="M9 9h.01" />
      <path d="M15 9h.01" />
    </>
  ),
  "/dashboard/review-users": (
    <>
      <circle cx="10" cy="9" r="3" />
      <path d="M4 20v-1a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v1" />
      <path d="M18 8l2 2-3 3" />
    </>
  ),
  "/dashboard/audit": (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
};

export function NavIcon({ href, className }: { href: string; className?: string }) {
  return <Icon className={className}>{ICONS[href] ?? <circle cx="12" cy="12" r="2" />}</Icon>;
}

export function SidebarToggleIcon({ collapsed }: { collapsed: boolean }) {
  return (
    <Icon className="h-4 w-4">
      {collapsed ? (
        <>
          <rect x="3" y="4" width="14" height="16" rx="2" />
          <path d="M9 4v16" />
          <path d="M13 12h4" />
          <path d="M15 10l2 2-2 2" />
        </>
      ) : (
        <>
          <rect x="3" y="4" width="14" height="16" rx="2" />
          <path d="M9 4v16" />
          <path d="M12 12H7" />
          <path d="M9 10 7 12l2 2" />
        </>
      )}
    </Icon>
  );
}
