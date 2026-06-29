# 權限設計（PERMISSIONS）

RBAC 以「角色 → 權限鍵」對應，定義於 `src/lib/permissions/catalog.ts`。
後端於頁面 / API / Server Action / 資料範圍 / 操作層級皆檢查，**不只前端隱藏**。

## 角色

| 角色 | 說明 | 範圍 |
| --- | --- | --- |
| OWNER | 負責人 | 全部權限、不受門市限制 |
| ADMIN | 系統管理員 | 帳號 / 角色 / 系統設定、唯讀營運 |
| MANAGER | 店長 | 所屬門市的訂單 / 庫存 / 班表 / 報表 |
| CASHIER | 收銀 | POS、當班訂單、交班 |
| WAREHOUSE | 倉庫 | 入庫 / 出庫 / 盤點 / 調撥 |
| PRODUCTION | 製作 | 生產單 / 領料 / 完工 / 報廢 |
| ACCOUNTANT | 會計 | 營收 / 成本 / 報表（唯讀） |
| STAFF | 一般員工 | 自己的班表 / 出勤 / 請假 |

## 權限鍵（節錄）

`system.manage / user.approve / role.manage / audit.read`、
`org.read|manage`、`employee.read|manage`、`schedule.read|manage|export`、
`attendance.read|clock|manage`、`leave.request|approve`、
`catalog.read|manage`、`inventory.read|adjust|transfer|count|waste`、
`purchase.read|manage|approve|receive`、`production.read|manage|execute`、
`pos.operate`、`sales.read|refund|shift`、`print.operate`、
`customer.read|manage`、`report.read|export`。

## 資料範圍

- `companyScope(actor)`：所有查詢限制 `companyId`，達成多租戶隔離。
- `assertStoreAccess(actor, storeId)`：非 OWNER/ADMIN/ACCOUNTANT 且有門市限制者，僅能存取被授權門市；`StoreUser` 記錄授權門市。
- 未限定門市（`storeIds` 空）者視為全公司。

## 檢查點

| 層級 | 機制 |
| --- | --- |
| 頁面路由 | `dashboard/layout.tsx` 取得 actor，導覽依權限過濾；各頁 `requirePermission()` |
| API / Route Handler | `requirePermission()` + `handleApiError()` |
| Server Action | 進入即 `requirePermission()`，再驗證門市 / 公司範圍 |
| 資料查詢 | `where: companyScope(actor)` |
| 操作（增刪改審核） | service 內二次驗證權限與狀態機 |
