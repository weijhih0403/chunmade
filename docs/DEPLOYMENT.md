# 部署（DEPLOYMENT）

## 環境需求

- Node.js 20+（建議 22/24）
- PostgreSQL 16
- 反向代理（Nginx / Caddy）提供 HTTPS

## 步驟

```bash
npm ci
npm run build            # prisma generate + next build
npm run prisma:deploy    # 套用 migration
npm run start            # 啟動（預設 0.0.0.0:3000）
```

## 環境變數（正式）

- `NODE_ENV=production`
- `DATABASE_URL`：正式資料庫
- `AUTH_SECRET`：長隨機字串（`openssl rand -base64 32`）
- `AUTH_URL` / `NEXTAUTH_URL`：實際網域（https）
- `PRINT_SIMULATION_MODE=false`（有實體標籤機時）

> 切勿提交 `.env`；使用部署平台的密鑰管理。

## 安全性

- 已設定安全 HTTP Header（`next.config.ts`：X-Content-Type-Options、X-Frame-Options、Referrer-Policy、Permissions-Policy）。
- 正式環境 Cookie：NextAuth 於 `production` 自動使用 `__Secure-` / `Secure` / `HttpOnly` / `SameSite`。
- 登入失敗鎖定：`AUTH_MAX_LOGIN_ATTEMPTS` / `AUTH_LOCK_MINUTES`。
- RBAC + 輸入驗證（Zod）+ Prisma 參數化查詢（防 SQL Injection）。

## 資料庫備份

建議每日 `pg_dump` 並異地保存；`StockMovement` / `AuditLog` / 財務明細為不可變歷史，請納入備份保留政策。

## Docker（本機 / 測試）

```bash
docker compose up -d        # PostgreSQL
```

未來可加入應用程式服務的 Dockerfile 與多階段建置（standalone 輸出）。
