# 既有專案盤點報告（EXISTING_PROJECT_AUDIT）

> Phase 0 產出。本文件記錄對工作區既有專案 `純手作/site` 的完整檢查結果，作為新 ERP 系統 `chun-handmade-erp` 的需求與功能參考來源。

盤點日期：2026-06-29
盤點人：資深全端架構師（AI Agent）
既有專案路徑：`<workspace>/site`
新專案路徑：`<workspace>/chun-handmade-erp`

---

## 0. 重大發現（必讀）

對 `site` 專案進行多重檢查（`Get-ChildItem -Recurse -File`、`cmd dir /s`、Cursor Glob `**/*.tsx`、`**/schema.prisma`）後確認：

- **既有專案的原始碼檔案全部遺失，只保留目錄骨架。**
  - `site/src` 底下共有 15 個項目，**全部都是空資料夾**，沒有任何 `.ts` / `.tsx` 檔。
  - `site/prisma` 只剩 `migrations/` 下 4 個 migration 資料夾名稱，**沒有 `schema.prisma`，也沒有任何 `migration.sql`**。
  - 專案根目錄缺少 `package.json`、`tsconfig.json`、`next.config.*`、`.env`，**只剩下一個 `postcss.config.mjs`**。
  - `node_modules`（405 個套件目錄）仍存在，但已無對應的原始碼與設定檔可供建置。

- **結論：沒有任何可直接重用的程式碼。** 既有專案僅能透過下列「間接證據」推測其原本的功能與資料模型：
  1. 目錄與路由命名。
  2. Prisma migration 資料夾命名。
  3. `postcss.config.mjs` 的內容（推測技術棧）。

因此本盤點以「**還原設計意圖**」為目標，而非「程式碼審查」。新系統將以全新方式建立，並把既有專案的功能意圖完整納入，不刪除、不覆寫既有 `site` 專案。

---

## 1. 現有技術架構（由間接證據推測）

| 項目 | 推測結果 | 依據 |
| --- | --- | --- |
| 框架 | Next.js（App Router） | 存在 `src/app/` 目錄、`src/app/api/.../route` 結構 |
| 語言 | TypeScript | 目錄命名慣例、`src/types/` |
| 樣式 | Tailwind CSS v4 | `postcss.config.mjs` 使用 `@tailwindcss/postcss` 外掛（v4 寫法） |
| ORM | Prisma | 存在 `prisma/migrations/` |
| 認證 | NextAuth / Auth.js | 存在 `src/app/api/auth/[...nextauth]/` |
| 套件（node_modules 殘留） | next, react, @prisma/client, prisma, next-auth, tailwindcss, typescript, @radix-ui, zod | `node_modules` 目錄掃描 |

`postcss.config.mjs` 內容：

```js
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};
export default config;
```

執行環境：Node `v24.15.0`、npm `11.12.1`、Windows（PowerShell）。

---

## 2. 現有頁面與路由（由目錄結構推測）

```text
site/src/
  app/
    api/
      auth/[...nextauth]/      → NextAuth 認證端點
      schedule/                → 排班相關 API
        export/                → 排班匯出（推測為 Excel 匯出）
    apply/                     → 使用者申請頁（註冊 / 申請帳號）
    login/                     → 登入頁
    dashboard/                 → 後台主區
      inventory/               → 庫存管理頁
      review-users/            → 管理員審核帳號頁
      schedule/                → 排班頁
  components/                  → 共用元件（內容遺失）
  lib/                         → 工具 / 設定（內容遺失）
  types/                       → 型別定義（內容遺失）
```

對應推測功能：

| 路由 | 推測功能 |
| --- | --- |
| `/login` | 員工登入 |
| `/apply` | 使用者申請帳號 |
| `/dashboard` | 後台首頁 |
| `/dashboard/review-users` | 管理員審核 / 核准帳號 |
| `/dashboard/schedule` | 排班表管理 |
| `/dashboard/inventory` | 庫存管理 |
| `/api/auth/[...nextauth]` | NextAuth 認證 |
| `/api/schedule/export` | 排班匯出（Excel） |

---

## 3. 現有資料表（由 migration 命名推測）

`prisma/migrations/` 內的 4 個 migration（僅存資料夾名稱，無 SQL 內容）：

| Migration 資料夾 | 推測新增 / 變更內容 |
| --- | --- |
| `20260507014156_init` | 初始：使用者 / 認證（User、Account、Session、VerificationToken）基本表 |
| `20260507015213_inventory_schedule` | 新增庫存（Inventory / Item）與排班（Schedule / Shift）相關表 |
| `20260507015925_employee_preferred_shift_employment` | 新增員工偏好班別（PreferredShift）、聘僱類型（Employment）欄位 / 表 |
| `20260507021140_user_approval_flow` | 加入帳號審核流程（User 增加 status / approved 欄位，審核紀錄） |

推測既有資料模型涵蓋：

- 認證：`User`、`Account`、`Session`
- 員工：聘僱類型、偏好班別、可排班時段
- 排班：班別 `Shift`、班表 `Schedule`
- 庫存：品項 `Item`、庫存量
- 審核流程：帳號 `status`（PENDING / APPROVED / REJECTED）

> 註：因 `migration.sql` 全數遺失，欄位細節無法 100% 還原，新系統將以更完整、正規化的方式重新設計（見 `docs/DATABASE_DESIGN.md`）。

---

## 4. 現有角色與權限（推測）

由 `review-users`（審核帳號）與 `apply`（申請帳號）推測，既有系統至少有兩種角色概念：

- **管理員 / Admin**：可進入 `review-users` 審核帳號、管理排班與庫存。
- **一般員工 / Staff**：申請帳號、等待核准、查看排班。

帳號審核流程（保留並擴充至新系統）：

```text
使用者於 /apply 申請 → 帳號狀態 PENDING → 管理員於 /dashboard/review-users 審核
  → APPROVED 可登入 / REJECTED 不可登入
```

既有系統的權限控制細節（是否僅前端隱藏）無從得知。**新系統將改以完整後端 RBAC 實作**（頁面、API、Server Action、資料範圍、操作層級皆檢查）。

---

## 5. 可保留功能（移轉到新系統）

下列功能意圖將完整保留並重構進新 ERP：

1. 使用者申請帳號（`/apply`）。
2. 管理員審核帳號、未核准不可登入（`/dashboard/review-users`）。
3. 員工聘僱類型、偏好班別、可排班時段。
4. 排班表管理（`/dashboard/schedule`）。
5. 排班匯出 Excel（`/api/schedule/export`）。
6. 庫存管理頁（`/dashboard/inventory`）—— 在新系統升級為「庫存異動帳」模型。
7. NextAuth 登入機制。

---

## 6. 需要重構的功能

| 既有（推測） | 新系統做法 |
| --- | --- |
| 庫存以單一 `quantity` 欄位儲存 | 改為 **StockMovement 不可變異動帳 + StockBalance 結餘**，禁止前端直接改總量 |
| 權限可能僅前端隱藏 | 改為 **後端 RBAC**：頁面 / API / Server Action / 資料範圍 / 操作層級全檢查 |
| 單店設計 | 改為 **單一公司、多門市、多倉庫** 資料模型 |
| 排班為獨立小功能 | 整合進 **員工 / 排班 / 出勤** 模組，並擴充打卡、請假、加班 |
| 商業邏輯可能寫在 page / route | 改為 **service / repository / policy / validator** 分層 |

---

## 7. ERP 尚缺少的功能（新系統需新增）

既有專案完全沒有的 ERP 能力，全部需從零建立：

- 公司 / 門市 / 倉庫 / 儲位 基礎資料。
- 完整 RBAC（8 種角色）與資料範圍限制。
- 商品主檔（原料 / 半成品 / 成品 / 銷售商品 / 服務）、單位換算、規格、加料選項。
- 庫存異動帳、批號、效期、FIFO、調撥、盤點、報廢、低庫存 / 即期提醒。
- 採購（申請 / 採購單 / 審核 / 分批收貨 / 退貨 / 供應商）。
- 生產與配方（BOM / 版本 / 領料 / 完工 / 損耗 / 生產成本）。
- POS 結帳（購物車 / 付款 / 找零 / 退款 / 交班 / 日結 / idempotency）。
- 標籤與單據列印（PrintJob / TSPL / TDP-225 代理）。
- 出勤打卡（動態 QR / 遲到早退 / 補打卡）。
- 客戶 / 會員 / 點數 / 儲值 / 優惠券（含交易明細帳）。
- 財務與營運報表（多維度 + Excel / CSV / 列印）。
- AuditLog、Notification、Sequence（單據編號）。

---

## 8. 資料遷移策略

由於既有資料庫 schema 與資料皆已遺失，遷移策略如下：

1. **無實際資料可遷移**：既有專案無 `schema.prisma`、無 seed、無資料庫 dump，因此沒有真實資料需要搬移。
2. **設計對應表**：仍在 `docs/MIGRATION_PLAN.md` 建立「舊（推測）→ 新」資料模型對應，供未來若取得舊資料庫備份時使用。
3. **預留遷移腳本**：新系統於 Phase 2 提供 `scripts/migrate-legacy.ts` 範本，可讀取舊 `User` / `Employee` / `Schedule` 資料表（若存在）轉入新模型。
4. **以 seed 取代遷移**：第一版以 `prisma/seed.ts` 建立完整可展示資料（公司、門市、員工、配方、庫存、採購、生產、銷售範例）。

---

## 9. 開發階段與優先順序

沿用需求指定的階段，並依風險與相依性排序：

| Phase | 內容 | 相依 |
| --- | --- | --- |
| 0 | 既有專案盤點（本文件） | — |
| 1 | 專案基礎：Next.js / TS / Tailwind / Prisma / Docker / Auth / RBAC / 公司門市倉庫 / AuditLog / 版面 | 0 |
| 2 | 員工 / 排班 / 出勤遷移 | 1 |
| 3 | 商品與庫存（異動帳 / 調撥 / 盤點 / 低庫存） | 1 |
| 4 | 採購（採購單 / 審核 / 收貨 / 退貨） | 3 |
| 5 | 生產與配方（BOM / 領料 / 完工 / 成本） | 3 |
| 6 | POS 與列印（結帳交易 / 退款 / 日結 / PrintJob） | 3,5 |
| 7 | 出勤打卡（動態 QR / 請假 / 加班 / 報表） | 2 |
| 8 | 會員與報表（點數 / 儲值 / 營運報表 / 匯出） | 6 |

每個 Phase 完成後執行 `lint / typecheck / test / build` 並修正錯誤才進入下一階段。

---

## 10. 技術決策與版本說明（升級原因）

既有 `node_modules` 雖殘留，但無 `package.json` 鎖定版本，故新專案重新選用目前穩定版本：

| 套件 | 採用版本策略 | 原因 |
| --- | --- | --- |
| Next.js | 15.x（App Router） | 與既有 App Router 一致，採目前穩定版 |
| React | 19.x | 隨 Next 15 |
| Tailwind CSS | v4 | 與既有 `@tailwindcss/postcss` 一致 |
| Prisma | 6.x | 目前穩定版，支援 Decimal、交易 |
| Auth.js (next-auth) | v5（beta 穩定線） | App Router 整合更佳 |
| Zod | 3.x | 表單與 API 驗證 |
| ExcelJS | 4.x | 報表 / 排班匯出 |
| Vitest | 3.x | 單元 / 整合測試 |
| Playwright | 1.x | E2E |

> 所有金額一律使用 Prisma `Decimal`，時區預設 `Asia/Taipei`，介面預設繁體中文。
