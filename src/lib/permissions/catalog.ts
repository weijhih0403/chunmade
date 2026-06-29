import { RoleName } from "@prisma/client";

/**
 * 權限鍵採 "<module>.<action>" 命名。
 * 後端 RBAC 依角色對應的權限集合判斷，不得只在前端隱藏。
 */
export const PERMISSION_DEFS = [
  // 系統 / 帳號 / 角色
  { key: "system.manage", module: "system", label: "系統設定管理" },
  { key: "user.read", module: "user", label: "查看帳號" },
  { key: "user.manage", module: "user", label: "管理帳號" },
  { key: "user.approve", module: "user", label: "審核帳號" },
  { key: "role.manage", module: "role", label: "管理角色與權限" },
  { key: "audit.read", module: "audit", label: "查看稽核紀錄" },

  // 組織
  { key: "org.read", module: "org", label: "查看公司/門市/倉庫" },
  { key: "org.manage", module: "org", label: "管理公司/門市/倉庫" },

  // 員工 / 排班 / 出勤
  { key: "employee.read", module: "employee", label: "查看員工" },
  { key: "employee.manage", module: "employee", label: "管理員工" },
  { key: "schedule.read", module: "schedule", label: "查看班表" },
  { key: "schedule.manage", module: "schedule", label: "管理班表" },
  { key: "schedule.export", module: "schedule", label: "匯出班表" },
  { key: "attendance.read", module: "attendance", label: "查看出勤" },
  { key: "attendance.clock", module: "attendance", label: "打卡" },
  { key: "attendance.manage", module: "attendance", label: "管理出勤/補打卡" },
  { key: "leave.request", module: "leave", label: "申請請假" },
  { key: "leave.approve", module: "leave", label: "審核請假" },

  // 商品 / 基礎資料
  { key: "catalog.read", module: "catalog", label: "查看商品/基礎資料" },
  { key: "catalog.manage", module: "catalog", label: "管理商品/基礎資料" },

  // 庫存
  { key: "inventory.read", module: "inventory", label: "查看庫存" },
  { key: "inventory.adjust", module: "inventory", label: "庫存調整" },
  { key: "inventory.transfer", module: "inventory", label: "倉庫調撥" },
  { key: "inventory.count", module: "inventory", label: "盤點" },
  { key: "inventory.waste", module: "inventory", label: "報廢" },

  // 採購
  { key: "purchase.read", module: "purchase", label: "查看採購" },
  { key: "purchase.manage", module: "purchase", label: "建立/編輯採購單" },
  { key: "purchase.approve", module: "purchase", label: "審核採購單" },
  { key: "purchase.receive", module: "purchase", label: "驗收入庫" },

  // 生產
  { key: "production.read", module: "production", label: "查看生產" },
  { key: "production.manage", module: "production", label: "建立/編輯生產單" },
  { key: "production.execute", module: "production", label: "領料/完工/報廢" },

  // POS / 銷售
  { key: "pos.operate", module: "pos", label: "POS 結帳操作" },
  { key: "sales.read", module: "sales", label: "查看銷售訂單" },
  { key: "sales.refund", module: "sales", label: "退款" },
  { key: "sales.shift", module: "sales", label: "交班/日結" },

  // 列印
  { key: "print.operate", module: "print", label: "建立列印工作" },

  // 客戶 / 會員
  { key: "customer.read", module: "customer", label: "查看客戶/會員" },
  { key: "customer.manage", module: "customer", label: "管理客戶/會員" },

  // 報表
  { key: "report.read", module: "report", label: "查看報表" },
  { key: "report.export", module: "report", label: "匯出報表" },
] as const;

export type PermissionKey = (typeof PERMISSION_DEFS)[number]["key"];

export const ALL_PERMISSION_KEYS = PERMISSION_DEFS.map((p) => p.key) as PermissionKey[];

/** 各角色對應的權限。OWNER 為全部權限。 */
export const ROLE_PERMISSIONS: Record<RoleName, PermissionKey[] | "*"> = {
  OWNER: "*",
  ADMIN: [
    "system.manage",
    "user.read",
    "user.manage",
    "user.approve",
    "role.manage",
    "audit.read",
    "org.read",
    "org.manage",
    "employee.read",
    "employee.manage",
    "schedule.read",
    "catalog.read",
    "catalog.manage",
    "inventory.read",
    "purchase.read",
    "production.read",
    "sales.read",
    "customer.read",
    "customer.manage",
    "report.read",
    "report.export",
  ],
  MANAGER: [
    "org.read",
    "employee.read",
    "schedule.read",
    "schedule.manage",
    "schedule.export",
    "attendance.read",
    "attendance.manage",
    "leave.approve",
    "catalog.read",
    "inventory.read",
    "inventory.adjust",
    "inventory.transfer",
    "inventory.count",
    "inventory.waste",
    "purchase.read",
    "purchase.manage",
    "purchase.approve",
    "purchase.receive",
    "production.read",
    "production.manage",
    "production.execute",
    "pos.operate",
    "sales.read",
    "sales.refund",
    "sales.shift",
    "print.operate",
    "customer.read",
    "customer.manage",
    "report.read",
    "report.export",
  ],
  CASHIER: [
    "org.read",
    "catalog.read",
    "inventory.read",
    "pos.operate",
    "sales.read",
    "sales.shift",
    "print.operate",
    "customer.read",
    "attendance.clock",
    "schedule.read",
    "leave.request",
  ],
  WAREHOUSE: [
    "org.read",
    "catalog.read",
    "inventory.read",
    "inventory.adjust",
    "inventory.transfer",
    "inventory.count",
    "inventory.waste",
    "purchase.read",
    "purchase.receive",
    "attendance.clock",
    "schedule.read",
    "leave.request",
  ],
  PRODUCTION: [
    "org.read",
    "catalog.read",
    "inventory.read",
    "production.read",
    "production.manage",
    "production.execute",
    "attendance.clock",
    "schedule.read",
    "leave.request",
  ],
  ACCOUNTANT: [
    "org.read",
    "catalog.read",
    "inventory.read",
    "purchase.read",
    "sales.read",
    "report.read",
    "report.export",
    "audit.read",
  ],
  STAFF: ["org.read", "schedule.read", "attendance.clock", "leave.request"],
};

/** 計算一組角色的有效權限集合 */
export function resolvePermissions(roles: RoleName[]): Set<PermissionKey> {
  const set = new Set<PermissionKey>();
  for (const role of roles) {
    const perms = ROLE_PERMISSIONS[role];
    if (perms === "*") {
      for (const k of ALL_PERMISSION_KEYS) set.add(k);
      return set;
    }
    for (const k of perms) set.add(k);
  }
  return set;
}
