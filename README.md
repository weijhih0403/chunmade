# 淳手作 ERP 系統

一套提供手作食品店、豆花店、飲料店或小型餐飲門市使用的 ERP 系統，整合 **POS 結帳 → 收款 → 庫存扣除 → 標籤列印 → 成本毛利 → 低庫存補貨 → 採購入庫 → 生產製作 → 人員排班出勤 → 營運報表** 的完整流程。

> 第一版即支援「單一公司、多門市、多倉庫」，資料模型非單店限定。

---

## 一、系統功能

| 模組 | 功能 |
| --- | --- |
| 認證 / RBAC | 帳號申請、管理員審核、8 種角色權限、門市 / 倉庫資料範圍限制 |
| 儀表板 | 今日營業額 / 訂單數 / 客單價 / 毛利、本月營收、低庫存、待收貨、待生產（即時查詢） |
| 基礎資料 | 公司、門市、倉庫、儲位、分類、單位 / 換算、商品、規格、加料、供應商、客戶、會員、員工 |
| 庫存 | 不可變庫存異動帳（StockMovement）、批號 / 效期、調撥、盤點、報廢、低庫存 / 即期提醒 |
| 採購 | 採購申請 / 採購單 / 審核 / 分批收貨 / 入庫 / 退貨 |
| 生產 | 配方 BOM / 版本、生產單、領料、完工入庫、批號、生產成本與損耗 |
| POS / 銷售 | 觸控結帳、加料 / 折扣、多種付款、找零、退款、交班日結、idempotency 防重複 |
| 列印 | PrintJob 佇列、TSPL 範本、TSC TDP-225 本機代理、模擬列印 |
| 出勤 | 動態 QR Code 打卡、遲到 / 早退 / 加班、請假、補打卡、出勤報表 |
| 會員 | 點數、儲值金（皆保留交易明細帳）、優惠、生日 |
| 報表 | 營收 / 毛利 / 庫存 / 採購 / 排班 / 出勤，支援日期 / 門市篩選與 Excel / CSV 匯出 |

> 各模組的實作進度請見 `docs/` 與專案 issue / phase 報告。Phase 0（盤點）與 Phase 1（基礎建設）已完成並通過 `lint / typecheck / test / build`。

## 二、技術架構

- **Next.js 15（App Router）** + **React 19** + **TypeScript（strict）**
- **Tailwind CSS v4**
- **PostgreSQL 16** + **Prisma ORM 6**
- **Auth.js / NextAuth v5**（Credentials + JWT session）
- **Zod**（表單與 API 驗證）、**bcryptjs**（密碼雜湊）
- **ExcelJS**（報表 / 排班匯出）
- **Docker Compose**（本機 PostgreSQL）
- **ESLint / Prettier**、**Vitest**（單元 / 整合）、**Playwright**（E2E）

分層架構：`components`（顯示）→ `modules`（各業務模組）→ `server/services`（商業邏輯）→ `server/repositories`（查詢）→ `lib`（共用：db / money / dates / permissions / errors / audit）。

詳見 `docs/ARCHITECTURE.md`。

## 三、安裝步驟

需求：Node.js 20+（建議 22/24）、Docker Desktop、npm。

```bash
# 1. 安裝相依套件
npm install

# 2. 複製環境變數
cp .env.example .env   # Windows PowerShell: Copy-Item .env.example .env

# 3. 啟動 PostgreSQL（Docker）
npm run docker:up

# 4. 套用資料庫 schema（開發）
npm run prisma:migrate    # 或首次可用 npm run db:push

# 5. 匯入種子資料
npm run db:seed

# 6. 啟動開發伺服器
npm run dev
# 開啟 http://localhost:3000
```

## 四、環境變數

見 `.env.example`。重點：

| 變數 | 說明 |
| --- | --- |
| `DATABASE_URL` | PostgreSQL 連線字串 |
| `AUTH_SECRET` | NextAuth 加密密鑰（`openssl rand -base64 32`） |
| `APP_TIMEZONE` | 預設 `Asia/Taipei` |
| `AUTH_MAX_LOGIN_ATTEMPTS` / `AUTH_LOCK_MINUTES` | 登入失敗鎖定 |
| `PRINT_AGENT_SHARED_SECRET` / `PRINT_SIMULATION_MODE` | 列印代理 |

> ⚠️ 切勿將 `.env` 提交至 Git。正式環境請使用環境變數管理機制。

## 五、Docker 啟動方式

```bash
npm run docker:up     # 啟動 PostgreSQL（背景）
npm run docker:down   # 停止
```

`docker-compose.yml` 內含健康檢查與資料持久化 volume `chun_erp_pgdata`，時區設為 `Asia/Taipei`。

## 六、Prisma Migration

```bash
npm run prisma:generate   # 產生 Prisma Client
npm run prisma:migrate    # 開發：建立並套用 migration
npm run prisma:deploy     # 正式：套用既有 migration
npm run prisma:studio     # 開啟 Prisma Studio
npm run db:reset          # 重置資料庫（會清空資料）
```

## 七、Seed

```bash
npm run db:seed
```

建立：1 間公司、2 間門市、2 個倉庫、各角色開發帳號、單位 / 分類 / 商品、豆花 / 豆漿配方、期初庫存、供應商等。

## 八、開發模式

```bash
npm run dev          # 開發伺服器
npm run lint         # ESLint
npm run typecheck    # TypeScript 型別檢查
npm run format       # Prettier 格式化
```

## 九、測試

```bash
npm run test         # Vitest 單元 / 整合測試
npm run test:e2e     # Playwright E2E（需先啟動 DB 與 dev server）
```

## 十、正式部署

1. 設定正式環境變數（`DATABASE_URL`、`AUTH_SECRET` 等）。
2. `npm ci && npm run build`。
3. `npm run prisma:deploy` 套用 migration。
4. `npm run start` 啟動（建議搭配反向代理與 HTTPS）。

詳見 `docs/DEPLOYMENT.md`。

## 十一、預設開發帳號

> 僅供開發 / 展示，密碼皆為 `Password123`。**正式環境請勿建立固定密碼帳號。**

| Email | 角色 | 說明 |
| --- | --- | --- |
| `owner@chun.local` | 負責人 OWNER | 全功能 |
| `admin@chun.local` | 系統管理員 ADMIN | 帳號 / 角色 / 設定 |
| `manager@chun.local` | 店長 MANAGER | 本店營運 |
| `cashier1@chun.local` | 收銀 CASHIER | 本店 POS |
| `cashier2@chun.local` | 收銀 CASHIER | 分店 POS |
| `warehouse@chun.local` | 倉庫 WAREHOUSE | 入出庫 / 盤點 |
| `production@chun.local` | 製作 PRODUCTION | 生產 |
| `staff1@chun.local` / `staff2@chun.local` | 一般員工 STAFF | 班表 / 打卡 |

## 十二、常見問題（FAQ）

- **Q：`prisma migrate` 連不上資料庫？** 確認 `npm run docker:up` 已啟動且 `DATABASE_URL` 正確。
- **Q：登入顯示「帳號尚未核准」？** 透過 `admin@chun.local` 進入「帳號審核」核准；seed 帳號預設已核准。
- **Q：build 出現 jose / Edge Runtime 警告？** 屬 next-auth 在 middleware 的已知警告，不影響建置與執行。
- **Q：沒有實體標籤機可測列印？** 設定 `PRINT_SIMULATION_MODE=true` 使用模擬列印。

---

本專案為既有 `site` 專案的後繼 ERP 系統。既有專案盤點見 `docs/EXISTING_PROJECT_AUDIT.md`，資料遷移見 `docs/MIGRATION_PLAN.md`。
