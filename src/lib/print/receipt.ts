/**
 * 80mm 熱感收據列印（瀏覽器列印方案）。
 *
 * 做法：開一個小視窗、寫入排版好的收據 HTML，再呼叫 window.print()。
 * 由作業系統的印表機驅動輸出到熱感出單機即可，免裝任何特殊套件。
 *
 * 錢箱：一般錢箱接在出單機上，於出單機驅動程式設定「列印前/後自動開啟錢箱」，
 * 這樣每次印收據就會自動彈開錢箱（屬印表機驅動設定，非本程式控制）。
 */

export type ReceiptLine = {
  name: string;
  quantity: number;
  price: number;
  lineTotal: number;
};

export type ReceiptData = {
  storeName: string;
  orderNo: string;
  dateTime: string;
  channelLabel: string;
  paymentLabel: string;
  lines: ReceiptLine[];
  total: number;
  tendered: number;
  change: number;
};

function nt(n: number) {
  return `NT$${Math.round(n).toLocaleString("zh-TW")}`;
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function buildReceiptHtml(data: ReceiptData) {
  const rows = data.lines
    .map(
      (l) => `
      <div class="line">
        <div class="name">${escapeHtml(l.name)}</div>
        <div class="qtyrow">
          <span>${l.quantity} x ${nt(l.price)}</span>
          <span>${nt(l.lineTotal)}</span>
        </div>
      </div>`,
    )
    .join("");

  return `<!doctype html>
<html lang="zh-Hant">
<head>
<meta charset="utf-8" />
<title>收據 ${escapeHtml(data.orderNo)}</title>
<style>
  @page { size: 80mm auto; margin: 0; }
  * { box-sizing: border-box; }
  body {
    width: 80mm;
    margin: 0;
    padding: 6px 8px;
    font-family: "Noto Sans TC", "Microsoft JhengHei", monospace;
    font-size: 12px;
    color: #000;
  }
  .center { text-align: center; }
  .store { font-size: 16px; font-weight: 700; }
  .muted { color: #000; }
  hr { border: none; border-top: 1px dashed #000; margin: 6px 0; }
  .meta { font-size: 11px; line-height: 1.5; }
  .line { margin-bottom: 4px; }
  .name { font-weight: 600; }
  .qtyrow { display: flex; justify-content: space-between; }
  .total { display: flex; justify-content: space-between; font-size: 14px; font-weight: 700; }
  .row { display: flex; justify-content: space-between; }
  .foot { margin-top: 8px; }
</style>
</head>
<body>
  <div class="center store">${escapeHtml(data.storeName)}</div>
  <div class="center">銷售收據</div>
  <hr />
  <div class="meta">
    <div class="row"><span>單號</span><span>${escapeHtml(data.orderNo)}</span></div>
    <div class="row"><span>時間</span><span>${escapeHtml(data.dateTime)}</span></div>
    <div class="row"><span>通路 / 付款</span><span>${escapeHtml(data.channelLabel)} / ${escapeHtml(data.paymentLabel)}</span></div>
  </div>
  <hr />
  ${rows}
  <hr />
  <div class="total"><span>合計</span><span>${nt(data.total)}</span></div>
  <div class="row"><span>收取</span><span>${nt(data.tendered)}</span></div>
  <div class="row"><span>找零</span><span>${nt(data.change)}</span></div>
  <hr />
  <div class="center foot">謝謝惠顧，歡迎再來！</div>
</body>
</html>`;
}

export function printReceipt(data: ReceiptData) {
  const html = buildReceiptHtml(data);
  const win = window.open("", "_blank", "width=380,height=640");
  if (!win) {
    alert("無法開啟列印視窗，請允許此網站的彈出視窗後再試一次。");
    return;
  }
  win.document.open();
  win.document.write(html);
  win.document.close();
  win.focus();
  // 等內容與字型載入後再列印，避免空白
  setTimeout(() => {
    win.print();
    win.close();
  }, 300);
}
