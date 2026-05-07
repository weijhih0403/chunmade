# 淳手作長期上線（Vercel + Neon）

這份流程可讓網站不依賴你的本機，24 小時可從外網連線。

## 1) 建立 Neon Postgres

1. 到 [Neon](https://neon.tech/) 建立新專案。
2. 建立完成後，取得連線字串（`postgresql://...`）。
3. 先保存這個值，稍後要放到 Vercel 的 `DATABASE_URL`。

## 2) 部署到 Vercel

1. 把目前專案推到 GitHub（`site` 專案）。
2. 到 [Vercel](https://vercel.com/) 匯入該 GitHub repo。
3. Framework 選 `Next.js`（通常會自動偵測）。

## 3) 設定 Vercel 環境變數

在 Vercel 專案設定加入以下變數：

- `DATABASE_URL`：Neon 的 Postgres 連線字串
- `AUTH_SECRET`：可用 `openssl rand -base64 32` 產生
- `AUTH_URL`：部署後網址（例如 `https://xxx.vercel.app`）
- `SEED_USERNAME_1`
- `SEED_PASSWORD_1`
- `SEED_USERNAME_2`
- `SEED_PASSWORD_2`

> 可先參考 `.env.example`。

## 4) 初始化資料庫（首次一次）

在本機執行（使用 Neon 的 `DATABASE_URL`）：

```bash
cd "/Users/chenweizhi/Desktop/純手作/site"
npx prisma db push
npm run db:seed
```

說明：
- `db push` 會把 Prisma schema 套到 Neon。
- `db:seed` 會建立兩組初始帳號（第一組為管理者）。

## 5) 重新部署

在 Vercel 按一次 Redeploy（或推一個 commit）後即可上線。

## 6) 驗證

1. 打開 `https://你的專案.vercel.app`
2. 登入第一組管理者帳號
3. 到 `員工審核` 頁測試帳號申請/核准流程

---

如果你要，我可以下一步直接幫你做：
- GitHub 推送前檢查清單
- 上線後安全加固（限制密碼規則、登入錯誤節流、審核操作紀錄）
