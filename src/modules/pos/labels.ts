import { SalesOrderStatus } from "@prisma/client";

export const SALES_STATUS: Record<
  SalesOrderStatus,
  { label: string; color: "gray" | "amber" | "blue" | "green" | "red" }
> = {
  DRAFT: { label: "草稿", color: "gray" },
  PENDING: { label: "待付款", color: "amber" },
  PAID: { label: "已付款", color: "green" },
  PREPARING: { label: "製作中", color: "blue" },
  READY: { label: "可取餐", color: "blue" },
  COMPLETED: { label: "已完成", color: "green" },
  CANCELLED: { label: "已取消", color: "red" },
  REFUNDED: { label: "已退款", color: "red" },
  PARTIALLY_REFUNDED: { label: "部分退款", color: "amber" },
};
