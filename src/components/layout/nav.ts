import type { PermissionKey } from "@/lib/permissions/catalog";

export type NavItem = {
  label: string;
  href: string;
  permission?: PermissionKey;
  group: string;
  /** 側欄收合時顯示的短標籤 */
  shortLabel?: string;
};

export const NAV_ITEMS: NavItem[] = [
  { label: "儀表板", href: "/dashboard", group: "總覽", shortLabel: "儀" },

  { label: "POS 點餐記錄", href: "/dashboard/pos-orders", permission: "sales.read", group: "營運", shortLabel: "POS" },

  { label: "商品", href: "/dashboard/items", permission: "catalog.read", group: "基礎資料", shortLabel: "品" },
  { label: "原物料", href: "/dashboard/materials", permission: "catalog.read", group: "基礎資料", shortLabel: "料" },
  { label: "分類", href: "/dashboard/categories", permission: "catalog.read", group: "基礎資料", shortLabel: "類" },
  { label: "單位", href: "/dashboard/units", permission: "catalog.read", group: "基礎資料", shortLabel: "位" },
  { label: "供應商", href: "/dashboard/suppliers", permission: "purchase.read", group: "基礎資料", shortLabel: "商" },

  { label: "庫存", href: "/dashboard/inventory", permission: "inventory.read", group: "庫存", shortLabel: "庫" },
  { label: "調撥", href: "/dashboard/transfers", permission: "inventory.transfer", group: "庫存", shortLabel: "撥" },
  { label: "盤點", href: "/dashboard/counts", permission: "inventory.count", group: "庫存", shortLabel: "盤" },

  { label: "採購單", href: "/dashboard/purchases", permission: "purchase.read", group: "採購", shortLabel: "採" },

  { label: "配方", href: "/dashboard/recipes", permission: "production.read", group: "生產", shortLabel: "方" },
  { label: "生產單", href: "/dashboard/production", permission: "production.read", group: "生產", shortLabel: "產" },

  { label: "員工", href: "/dashboard/employees", permission: "employee.read", group: "人事", shortLabel: "員" },
  { label: "排班", href: "/dashboard/schedule", permission: "schedule.read", group: "人事", shortLabel: "班" },

  { label: "報表", href: "/dashboard/reports", permission: "report.read", group: "報表", shortLabel: "報" },

  { label: "門市 / 倉庫", href: "/dashboard/org", permission: "org.read", group: "系統", shortLabel: "店" },
  { label: "帳號審核", href: "/dashboard/review-users", permission: "user.approve", group: "系統", shortLabel: "審" },
  { label: "稽核紀錄", href: "/dashboard/audit", permission: "audit.read", group: "系統", shortLabel: "稽" },
];
