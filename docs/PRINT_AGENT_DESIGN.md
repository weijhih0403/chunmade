# 列印代理設計（PRINT_AGENT_DESIGN）

針對 TSC TDP-225 USB 標籤機。Web 系統不直接存取 USB，改採「本機列印代理」架構。

## 架構

```text
ERP Web 系統
  → 建立 PrintJob（status=PENDING，payload 含標籤資料 / TSPL）
  → 門市本機列印代理程式輪詢 / 長連線拉取待印工作
  → 代理將資料套入 TSPL 範本
  → 透過 USB 送至 TSC TDP-225
  → 回報列印結果（SUCCESS / FAILED）
  → ERP 更新 PrintJob 狀態（失敗可重試）
```

## PrintJob 狀態

`PENDING → PRINTING → SUCCESS`；失敗為 `FAILED`（保留 `errorMessage`、`attempts`），可重試；可 `CANCELLED`。

## 結帳後流程

結帳完成**不強制自動列印**，前端顯示：
- 列印標籤
- 稍後列印
- 不列印

## 標籤內容

商品名稱、規格、加料、糖度、冰量、訂單編號、取餐編號、製作時間、保存期限、備註、條碼 / QR Code。

## TSPL 範本（範例）

```tspl
SIZE 40 mm, 30 mm
GAP 2 mm, 0 mm
CLS
TEXT 20,20,"3",0,1,1,"傳統豆花"
TEXT 20,60,"2",0,1,1,"少糖 / 去冰"
TEXT 20,90,"2",0,1,1,"取餐號: A12"
TEXT 20,120,"1",0,1,1,"保存期限: 2026-06-30"
QRCODE 250,20,L,5,A,0,"SO-20260629-0001"
PRINT 1,1
```

## 第一版範圍

- 列印工作 API（建立 / 拉取 / 回報）
- 列印佇列
- 標籤預覽
- TSPL 範本產生器
- 模擬列印模式（`PRINT_SIMULATION_MODE=true`：直接標記 SUCCESS，不需實體機）
- 失敗重試機制

## 安全

代理以 `PRINT_AGENT_SHARED_SECRET` 認證；工作限定該門市範圍。
