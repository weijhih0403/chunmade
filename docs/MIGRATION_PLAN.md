# 資料遷移計畫（MIGRATION_PLAN）

## 背景

既有 `site` 專案的原始碼、`schema.prisma`、migration SQL 與資料皆已遺失（見 `EXISTING_PROJECT_AUDIT.md`），目前無實際資料可遷移。本計畫提供「舊（推測）→ 新」對應，供未來取得舊資料庫備份時使用。

## 舊 → 新 對應（推測）

| 舊（推測） | 新模型 | 備註 |
| --- | --- | --- |
| User（含 status 審核） | `User`（status / approvedAt / approvedBy） | 保留審核流程 |
| Account / Session | `Account` / `Session` | NextAuth 標準 |
| 員工聘僱 / 偏好班別 | `Employee` / `EmploymentType` / `EmployeePreference` | 拆分正規化 |
| Shift / Schedule | `Shift` / `Schedule` | 加上門市 / 班次起訖 |
| Inventory（單一 quantity） | `Item` + `StockBalance` + `StockMovement` | 由量值轉為異動帳 + 期初 INITIAL |

## 遷移步驟（未來）

1. 連接舊資料庫（唯讀）。
2. 建立公司 / 門市 / 倉庫主檔。
3. 匯入 `User` → 設定 `companyId`、保留 `status`、重設密碼或保留雜湊。
4. 依舊角色對應新 `Role` 並建立 `UserRole`。
5. 匯入員工 / 班別 / 班表。
6. 匯入商品；舊庫存量以 `INITIAL` 異動建立期初庫存與結餘。
7. 核對結餘與報表。

## 工具

- 第一版以 `prisma/seed.ts` 建立完整展示資料取代遷移。
- 預留 `scripts/migrate-legacy.ts`（未來）讀取舊資料表轉入新模型。
- 所有遷移以交易執行並可重跑（idempotent）。
