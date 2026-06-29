# API 與 Server Action（API）

## 回傳格式

所有 Route Handler 統一回傳：

```jsonc
// 成功
{ "ok": true, "data": { /* ... */ } }
// 失敗
{ "ok": false, "error": { "code": "FORBIDDEN", "message": "...", "details": null } }
```

由 `src/lib/api/response.ts` 的 `ok()` / `fail()` / `handleApiError()` 產生；
錯誤碼來自 `AppError`：`VALIDATION_ERROR(400) / UNAUTHORIZED(401) / FORBIDDEN(403) / NOT_FOUND(404) / CONFLICT(409) / BUSINESS_RULE(422) / INTERNAL(500)`。

## 認證

- `POST /api/auth/callback/credentials`、`GET/POST /api/auth/*`：NextAuth 端點。
- Session：JWT，包含 `id / companyId / roles / storeIds`。

## Server Actions（節錄）

| 模組 | Action | 權限 |
| --- | --- | --- |
| auth | `loginAction` / `applyAction` | 公開 |
| users | `approveUserAction` / `rejectUserAction` | `user.approve` |
| catalog | 商品 / 分類 CRUD | `catalog.manage` |
| inventory | 調整 / 調撥 / 盤點 / 報廢 | `inventory.*` |
| purchasing | 採購單 / 審核 / 收貨 | `purchase.*` |
| production | 生產單 / 領料 / 完工 | `production.*` |
| pos | 結帳 / 退款 / 交班 | `pos.operate` / `sales.*` |
| printing | 建立 / 重試 PrintJob | `print.operate` |

## 規劃中的 Route Handlers

| 路徑 | 用途 | 權限 |
| --- | --- | --- |
| `GET /api/schedule/export` | 班表 Excel 匯出 | `schedule.export` |
| `GET /api/reports/*/export` | 報表 Excel / CSV 匯出 | `report.export` |
| `POST /api/attendance/clock` | 動態 QR 打卡 | `attendance.clock` |
| `GET /api/print/jobs` / `POST /api/print/jobs/:id/result` | 門市列印代理拉取與回報 | 共享密鑰 |

> 每個 Server Action 進入時即 `requirePermission()`，再以 `companyScope` / `assertStoreAccess` 限縮資料範圍。
