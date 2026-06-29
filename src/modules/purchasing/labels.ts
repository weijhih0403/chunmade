import { PurchaseOrderStatus } from "@prisma/client";

export const PO_STATUS: Record<
  PurchaseOrderStatus,
  { label: string; color: "gray" | "amber" | "green" | "blue" | "red" }
> = {
  DRAFT: { label: "草稿", color: "gray" },
  PENDING_APPROVAL: { label: "待審核", color: "amber" },
  APPROVED: { label: "已核准", color: "blue" },
  PARTIALLY_RECEIVED: { label: "部分收貨", color: "amber" },
  RECEIVED: { label: "已收貨", color: "green" },
  CANCELLED: { label: "已取消", color: "red" },
  CLOSED: { label: "已結案", color: "gray" },
};
