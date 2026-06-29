import { RoleName, ItemType, StockMovementType } from "@prisma/client";

export const ROLE_LABELS: Record<RoleName, string> = {
  OWNER: "負責人",
  ADMIN: "系統管理員",
  MANAGER: "店長",
  CASHIER: "收銀人員",
  WAREHOUSE: "倉庫人員",
  PRODUCTION: "製作人員",
  ACCOUNTANT: "會計人員",
  STAFF: "一般員工",
};

export function roleLabels(roles: RoleName[]): string {
  return roles.map((r) => ROLE_LABELS[r]).join("、") || "未指派角色";
}

export const ITEM_TYPE_LABELS: Record<ItemType, string> = {
  RAW_MATERIAL: "原料",
  SEMI_FINISHED: "半成品",
  FINISHED_GOOD: "成品",
  SALE_ITEM: "銷售商品",
  SERVICE: "服務項目",
};

export const STOCK_MOVEMENT_TYPE_LABELS: Record<StockMovementType, string> = {
  PURCHASE_RECEIPT: "採購入庫",
  SALE: "銷售出庫",
  PRODUCTION_ISSUE: "生產領料",
  PRODUCTION_RECEIPT: "生產完工入庫",
  TRANSFER_OUT: "調撥出庫",
  TRANSFER_IN: "調撥入庫",
  ADJUSTMENT_IN: "盤盈",
  ADJUSTMENT_OUT: "盤虧",
  WASTE: "報廢",
  RETURN_IN: "銷售退貨",
  RETURN_OUT: "採購退貨",
  INITIAL: "期初庫存",
};
