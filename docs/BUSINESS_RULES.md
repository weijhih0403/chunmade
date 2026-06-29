# 商業規則（BUSINESS_RULES）

## 通則

1. 金額使用 `Decimal`，禁止浮點數直接計算金額。
2. 數量使用 `Decimal`。
3. 重要資料軟刪除（`deletedAt`）。
4. 單據完成後不可直接刪除；需修正改以取消 / 沖銷 / 退貨 / 調整。
5. 庫存與財務異動必須保留歷史。
6. 關鍵流程使用 `prisma.$transaction`。
7. 狀態變更必須符合合法狀態機（`lib/state-machine.ts`）。
8. API 驗證使用者對該公司 / 門市 / 倉庫的操作權限。
9. 關鍵操作寫入 `AuditLog`。
10. 刪除前檢查是否被單據引用。
11. 不信任前端傳入的價格 / 成本 / 權限 / 庫存，後端重新驗證與計算。
12. 庫存不足預設禁止完成銷售 / 領料 / 調撥；可由系統設定允許負庫存（`allowNegative`）。
13. 訂單完成保存售價 / 折扣 / 稅 / 成本 / 毛利快照。

## 狀態機

### 採購單 PurchaseOrder
`DRAFT → PENDING_APPROVAL → APPROVED → PARTIALLY_RECEIVED → RECEIVED → CLOSED`，任意可 `CANCELLED`（依規則）。

### 銷售訂單 SalesOrder
`DRAFT → PENDING → PAID → PREPARING → READY → COMPLETED`；`PAID` 後可 `REFUNDED / PARTIALLY_REFUNDED`。

### 生產單 ProductionOrder
`DRAFT → RELEASED → IN_PROGRESS → COMPLETED`（或 `CANCELLED`）。

### 調撥 StockTransfer
`DRAFT → PENDING → IN_TRANSIT → COMPLETED`（或 `CANCELLED`）。

## 庫存異動類型（StockMovementType）

入庫（+1）：`PURCHASE_RECEIPT / PRODUCTION_RECEIPT / TRANSFER_IN / ADJUSTMENT_IN / RETURN_IN / INITIAL`
出庫（−1）：`SALE / PRODUCTION_ISSUE / TRANSFER_OUT / ADJUSTMENT_OUT / WASTE / RETURN_OUT`

每筆異動保留：來源單據 / 單號、操作人、時間、原因、異動前後數量、門市、倉庫、批號。

## POS 結帳（單一交易）

1. 建立 `SalesOrder` 與明細、加料快照。
2. 建立 `Payment`。
3. 依商品 / 配方扣除對應庫存（`applyStockMovement` type=`SALE`）。
4. 寫入庫存異動帳並更新結餘。
5. 記錄成本與毛利快照。
6. 寫入 `AuditLog`。
7. 建立 `PrintJob`（依使用者選擇）。

以 `idempotencyKey` 確保同一結帳請求不重複建立訂單或重複扣庫存。

## 生產完工

1. 扣除實際耗用原料（`PRODUCTION_ISSUE`）。
2. 增加成品庫存（`PRODUCTION_RECEIPT`）並建立批號 / 製造日 / 效期。
3. 計算實際生產成本（原料成本彙總 / 產量）。
4. 記錄損耗與產量差異。

## 採購收貨

收貨完成於同一交易產生庫存異動（`PURCHASE_RECEIPT`）並更新採購單明細 `receivedQty` 與單據狀態。
