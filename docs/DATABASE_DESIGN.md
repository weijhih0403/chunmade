# 資料庫設計（DATABASE_DESIGN）

資料庫：PostgreSQL；ORM：Prisma。完整定義見 `prisma/schema.prisma`，ER 圖見 `docs/ERD.md`。

## 設計通則

- **多租戶**：業務表帶 `companyId`（多數）與 `storeId` / `warehouseId`，以索引純量欄位實作，避免 `Company` 背向關聯爆炸；資料隔離由 service 層 `companyScope()` 強制。
- **金額 / 數量**：`Decimal(18,4)`；單位換算 `Decimal(18,6)`。
- **軟刪除**：重要資料以 `deletedAt` 標記；單據完成後不可直接刪除，改以取消 / 沖銷 / 退貨 / 調整。
- **稽核欄位**：`createdAt / updatedAt`，並以 `createdBy / updatedBy`（使用者 ID 純量）記錄。
- **單號**：`Sequence` 表產生可讀單號（`SO-YYYYMMDD-0001`），不以 DB id 對外。

## 核心模型群組

### 組織 / 認證 / RBAC
`Company → Store → Warehouse → StorageLocation`；`User / Account / Session / VerificationToken`；
`Role / Permission / RolePermission / UserRole / StoreUser / WarehouseUser`。

### 員工 / 排班 / 出勤
`Department / Position / EmploymentType / Employee`；`Shift / EmployeePreference / Schedule`；
`Attendance / AttendanceQrToken / LeaveRequest`。

### 基礎資料
`Category / Unit / UnitConversion / Item / ItemVariant / ModifierGroup / ModifierOption / PaymentMethodConfig`。
`Item.type`：`RAW_MATERIAL / SEMI_FINISHED / FINISHED_GOOD / SALE_ITEM / SERVICE`。

### 庫存（核心）
- `StockMovement`：**不可變異動帳**，記錄 `type / direction / quantity / quantityBefore / quantityAfter / unitCost / 來源單據 / 操作人 / 倉庫 / 批號`。
- `StockBalance`：即時結餘（`quantity / reserved / avgCost`），由 `StockMovement` 維護。
- `StockLot`：批號 / 製造日 / 效期；`StockReservation`：保留量。
- `StockTransfer(+Item)` 調撥、`StockCount(+Item)` 盤點、`WasteRecord` 報廢。

> 庫存量**不可**只放在 `Item` 上的單一欄位，且禁止前端直接改總量。所有變更必經 `applyStockMovement()`。

### 採購
`PurchaseRequest(+Item) → PurchaseOrder(+Item) → GoodsReceipt(+Item)`，狀態見 `BUSINESS_RULES.md`。

### 生產
`Recipe → RecipeVersion → RecipeItem`（BOM）；`ProductionOrder → ProductionMaterial / ProductionOutput`。

### 銷售 / POS
`CashRegister → CashShift`；`SalesOrder → SalesOrderItem → SalesOrderModifier`；`Payment / Refund`。
`SalesOrder` 保存售價 / 折扣 / 稅 / 成本 / 毛利**快照**，並有唯一 `idempotencyKey` 防重複結帳。

### 列印 / 會員 / 系統
`PrintJob`；`Customer / Member / LoyaltyTransaction / StoredValueTransaction`（點數 / 儲值皆有明細帳）；
`Notification / AuditLog / Sequence`。

## 移動平均成本

入庫（`direction=+1` 且有成本）時更新 `StockBalance.avgCost`：
`新均價 = (前結餘×前均價 + 入庫量×入庫成本) / (前結餘 + 入庫量)`。出庫以當前均價認列成本。
