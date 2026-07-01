import type { DeliveryNoteStatus } from "@prisma/client";

export const DELIVERY_STATUS: Record<
  DeliveryNoteStatus,
  { label: string; color: "gray" | "green" | "amber" | "red" }
> = {
  IN_PROGRESS: { label: "配送中", color: "amber" },
  COMPLETED: { label: "已完成", color: "green" },
  CANCELLED: { label: "已取消", color: "gray" },
};
