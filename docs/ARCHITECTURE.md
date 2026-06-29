# 系統架構（ARCHITECTURE）

## 分層

```text
src/
  app/                     # Next.js App Router（頁面 / 路由 / API）
    api/                   # Route Handlers（auth、列印代理、匯出等）
    login/  apply/         # 認證頁
    dashboard/             # 後台（受保護，layout 內做 RBAC 守門）
  components/
    ui/                    # 純展示元件（Button / Input / Card …）
    layout/                # Sidebar / Topbar / 導覽設定
    forms/ tables/ charts/ pos/
  modules/                 # 各業務模組（actions + 模組內 service）
    auth/ users/ employees/ scheduling/ attendance/
    catalog/ inventory/ purchasing/ production/ sales/ pos/
    printing/ customers/ reports/
  server/
    services/              # 跨模組商業邏輯（stock、sequence …）
    repositories/          # 集中查詢
    policies/              # 權限政策
    validators/            # Zod schema
    transactions/          # 交易封裝
  lib/
    auth/ db/ money/ dates/ permissions/ errors/ audit/ api/
  types/
```

## 原則

- **React Component 只負責顯示與互動**；商業邏輯放在 `server/services` 或模組 service。
- **Prisma 查詢集中**在 repository / service，不在頁面散落重複查詢。
- **權限判斷集中**在 `lib/permissions`（RBAC）與 policy。後端一律驗證，不只前端隱藏。
- **Server / Client Component 分離**：僅在需要互動 / 瀏覽器 API / 狀態時加 `"use client"`。
- **統一錯誤格式**：`lib/errors` 的 `AppError`；API 經 `lib/api/response` 輸出一致格式 `{ ok, data | error }`。
- **金額一律 Decimal**：`lib/money` 包裝 `Prisma.Decimal`，禁止浮點數直接計算金額。
- **時區 Asia/Taipei**：`lib/dates` 統一處理營業日 / 單號日期。

## 認證流程

1. `middleware.ts` 使用 edge 安全的 `authConfig`（不含 Prisma）判斷是否登入並導向。
2. 登入由 `lib/auth`（Node 執行環境）的 Credentials provider 處理：驗證密碼（bcrypt）、檢查 `status=APPROVED`、登入失敗計數 / 鎖定。
3. Session 採 JWT 策略，token 內含 `id / companyId / roles / storeIds`，供 `getActor()` 解析權限。

## 關鍵交易

POS 結帳、採購收貨、生產完工、調撥等皆以 `prisma.$transaction` 包裹，於同一交易內完成單據、明細、庫存異動帳、結餘更新、稽核紀錄，確保一致性。
