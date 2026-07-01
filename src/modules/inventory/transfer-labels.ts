export type TransferSettlementStatus = "PENDING" | "COLLECTED" | "PAID" | "WAIVED";

export const SETTLEMENT_STATUS: Record<
  TransferSettlementStatus,
  { label: string; color: "gray" | "green" | "amber" | "blue" }
> = {
  PENDING: { label: "待處理", color: "amber" },
  COLLECTED: { label: "已收款", color: "green" },
  PAID: { label: "已付款", color: "green" },
  WAIVED: { label: "免結算", color: "gray" },
};

export function settlementStatusLabel(status: TransferSettlementStatus) {
  return SETTLEMENT_STATUS[status].label;
}

export function settlementStatusColor(status: TransferSettlementStatus) {
  return SETTLEMENT_STATUS[status].color;
}
