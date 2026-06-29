import type { PermissionKey } from "@/lib/permissions/catalog";

export type NavItem = {
  label: string;
  href: string;
  permission?: PermissionKey;
  group: string;
};

export const NAV_ITEMS: NavItem[] = [
  { label: "儀表板", href: "/dashboard", group: "總覽" },

  { label: "POS 結帳", href: "/dashboard/pos", permission: "pos.operate", group: "營運" },
  { label: "銷售訂單", href: "/dashboard/sales", permission: "sales.read", group: "營運" },

  { label: "商品", href: "/dashboard/items", permission: "catalog.read", group: "基礎資料" },
  { label: "分類", href: "/dashboard/categories", permission: "catalog.read", group: "基礎資料" },
  { label: "單位", href: "/dashboard/units", permission: "catalog.read", group: "基礎資料" },
  { label: "供應商", href: "/dashboard/suppliers", permission: "purchase.read", group: "基礎資料" },
  { label: "客戶 / 會員", href: "/dashboard/customers", permission: "customer.read", group: "基礎資料" },

  { label: "庫存", href: "/dashboard/inventory", permission: "inventory.read", group: "庫存" },
  { label: "調撥", href: "/dashboard/transfers", permission: "inventory.transfer", group: "庫存" },
  { label: "盤點", href: "/dashboard/counts", permission: "inventory.count", group: "庫存" },

  { label: "採購單", href: "/dashboard/purchases", permission: "purchase.read", group: "採購" },

  { label: "配方", href: "/dashboard/recipes", permission: "production.read", group: "生產" },
  { label: "生產單", href: "/dashboard/production", permission: "production.read", group: "生產" },

  { label: "員工", href: "/dashboard/employees", permission: "employee.read", group: "人事" },
  { label: "排班", href: "/dashboard/schedule", permission: "schedule.read", group: "人事" },
  { label: "出勤", href: "/dashboard/attendance", permission: "attendance.read", group: "人事" },

  { label: "報表", href: "/dashboard/reports", permission: "report.read", group: "報表" },

  { label: "門市 / 倉庫", href: "/dashboard/org", permission: "org.read", group: "系統" },
  { label: "帳號審核", href: "/dashboard/review-users", permission: "user.approve", group: "系統" },
  { label: "稽核紀錄", href: "/dashboard/audit", permission: "audit.read", group: "系統" },
];
