"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { checkoutAction, type CheckoutResult } from "@/modules/pos/checkout";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import { printReceipt, type ReceiptData } from "@/lib/print/receipt";
import { OrderChannel, PaymentMethod } from "@prisma/client";

type Product = {
  id: string;
  name: string;
  sku: string;
  barcode: string | null;
  price: number;
  categoryName: string;
};
type CartLine = { itemId: string; name: string; price: number; quantity: number };

const CHANNEL_LABELS: Record<OrderChannel, string> = {
  DINE_IN: "內用",
  TAKEOUT: "外帶",
  DELIVERY: "外送",
};
const PAYMENT_LABELS: Partial<Record<PaymentMethod, string>> = {
  CASH: "現金",
  CREDIT_CARD: "信用卡",
  LINE_PAY: "LINE Pay",
  MOBILE_PAY: "行動支付",
};

function newKey() {
  return (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`).toString();
}

export function PosClient({
  products,
  storeName,
}: {
  products: Product[];
  storeName: string;
}) {
  const [cart, setCart] = useState<CartLine[]>([]);
  const [channel, setChannel] = useState<OrderChannel>("TAKEOUT");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CASH");
  const [tendered, setTendered] = useState<string>("");
  const [idempotencyKey, setIdempotencyKey] = useState<string>(newKey);
  const [result, setResult] = useState<CheckoutResult | null>(null);
  const [scan, setScan] = useState<string>("");
  const [scanError, setScanError] = useState<string>("");
  const [lastReceipt, setLastReceipt] = useState<ReceiptData | null>(null);
  const scanRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();

  const categories = useMemo(() => {
    const set = new Map<string, Product[]>();
    for (const p of products) {
      const list = set.get(p.categoryName) ?? [];
      list.push(p);
      set.set(p.categoryName, list);
    }
    return [...set.entries()];
  }, [products]);

  const total = cart.reduce((s, l) => s + l.price * l.quantity, 0);
  const changeDue = paymentMethod === "CASH" ? Math.max(0, Number(tendered || 0) - total) : 0;

  function addToCart(p: Product) {
    setResult(null);
    setCart((prev) => {
      const found = prev.find((l) => l.itemId === p.id);
      if (found) {
        return prev.map((l) => (l.itemId === p.id ? { ...l, quantity: l.quantity + 1 } : l));
      }
      return [...prev, { itemId: p.id, name: p.name, price: p.price, quantity: 1 }];
    });
  }
  function changeQty(itemId: string, delta: number) {
    setCart((prev) =>
      prev
        .map((l) => (l.itemId === itemId ? { ...l, quantity: l.quantity + delta } : l))
        .filter((l) => l.quantity > 0),
    );
  }

  function handleScan() {
    const code = scan.trim();
    if (!code) return;
    const lower = code.toLowerCase();
    const product = products.find(
      (p) => p.barcode?.toLowerCase() === lower || p.sku.toLowerCase() === lower,
    );
    if (product) {
      addToCart(product);
      setScan("");
      setScanError("");
    } else {
      setScanError(`找不到條碼 / SKU：${code}`);
      setScan("");
    }
    scanRef.current?.focus();
  }

  function checkout() {
    if (cart.length === 0) return;
    const snapshotLines = cart.map((l) => ({
      name: l.name,
      quantity: l.quantity,
      price: l.price,
      lineTotal: l.price * l.quantity,
    }));
    const snapshotTotal = total;
    const snapshotTendered = paymentMethod === "CASH" ? Number(tendered || 0) : total;
    const snapshotChange = changeDue;
    const snapshotChannel = CHANNEL_LABELS[channel];
    const snapshotPayment = PAYMENT_LABELS[paymentMethod] ?? paymentMethod;
    startTransition(async () => {
      const res = await checkoutAction({
        idempotencyKey,
        channel,
        paymentMethod,
        amountTendered: snapshotTendered,
        lines: cart.map((l) => ({ itemId: l.itemId, quantity: l.quantity })),
      });
      setResult(res);
      if (res.ok) {
        setLastReceipt({
          storeName,
          orderNo: res.orderNo,
          dateTime: new Date().toLocaleString("zh-TW"),
          channelLabel: snapshotChannel,
          paymentLabel: snapshotPayment,
          lines: snapshotLines,
          total: snapshotTotal,
          tendered: snapshotTendered,
          change: snapshotChange,
        });
        setCart([]);
        setTendered("");
        setScanError("");
        setIdempotencyKey(newKey());
        scanRef.current?.focus();
      }
    });
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      {/* 商品區 */}
      <div className="lg:col-span-2">
        <div className="mb-4">
          <label className="mb-1 block text-xs text-gray-500">
            掃描條碼 / 輸入 SKU（掃描槍掃到會自動加入）
          </label>
          <input
            ref={scanRef}
            value={scan}
            onChange={(e) => setScan(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleScan();
              }
            }}
            autoFocus
            placeholder="掃描條碼或輸入 SKU 後按 Enter"
            className="h-11 w-full rounded-lg border border-gray-300 px-3 text-base focus:border-amber-400 focus:outline-none"
          />
          {scanError && <p className="mt-1 text-sm text-red-600">{scanError}</p>}
        </div>

        {categories.length === 0 ? (
          <p className="py-10 text-center text-gray-400">尚無可販售商品，請先於商品主檔建立。</p>
        ) : (
          categories.map(([cat, list]) => (
            <div key={cat} className="mb-5">
              <h3 className="mb-2 text-sm font-semibold text-gray-500">{cat}</h3>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {list.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => addToCart(p)}
                    className="flex h-24 flex-col justify-between rounded-xl border border-gray-200 bg-white p-3 text-left shadow-sm transition hover:border-amber-400 hover:shadow"
                  >
                    <span className="font-medium text-gray-900">{p.name}</span>
                    <span className="text-right text-amber-600">NT$ {p.price}</span>
                  </button>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* 購物車 / 結帳 */}
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <h3 className="mb-3 text-lg font-bold">購物車</h3>
        <div className="mb-3 max-h-72 space-y-2 overflow-y-auto">
          {cart.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-400">點選左側商品加入</p>
          ) : (
            cart.map((l) => (
              <div key={l.itemId} className="flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{l.name}</p>
                  <p className="text-xs text-gray-500">NT$ {l.price}</p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => changeQty(l.itemId, -1)}
                    className="h-7 w-7 rounded bg-gray-100 text-lg leading-none"
                  >
                    −
                  </button>
                  <span className="w-6 text-center">{l.quantity}</span>
                  <button
                    onClick={() => changeQty(l.itemId, 1)}
                    className="h-7 w-7 rounded bg-gray-100 text-lg leading-none"
                  >
                    +
                  </button>
                </div>
                <span className="w-16 text-right text-sm font-semibold">
                  {l.price * l.quantity}
                </span>
              </div>
            ))
          )}
        </div>

        <div className="space-y-2 border-t pt-3">
          <div className="flex gap-2">
            <Select value={channel} onChange={(e) => setChannel(e.target.value as OrderChannel)}>
              {Object.entries(CHANNEL_LABELS).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </Select>
            <Select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
            >
              {Object.entries(PAYMENT_LABELS).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </Select>
          </div>

          {paymentMethod === "CASH" && (
            <input
              type="number"
              inputMode="decimal"
              placeholder="收取現金"
              value={tendered}
              onChange={(e) => setTendered(e.target.value)}
              className="h-11 w-full rounded-lg border border-gray-300 px-3 text-right text-lg"
            />
          )}

          <div className="flex justify-between text-lg font-bold">
            <span>合計</span>
            <span>NT$ {total.toLocaleString("zh-TW")}</span>
          </div>
          {paymentMethod === "CASH" && Number(tendered) > 0 && (
            <div className="flex justify-between text-sm text-gray-600">
              <span>找零</span>
              <span>NT$ {changeDue.toLocaleString("zh-TW")}</span>
            </div>
          )}

          <Button
            onClick={checkout}
            disabled={pending || cart.length === 0}
            className="h-12 w-full text-base"
          >
            {pending ? "結帳中…" : "結帳"}
          </Button>

          {result && (
            <div
              className={`rounded-lg px-3 py-2 text-sm ${
                result.ok ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
              }`}
            >
              {result.ok
                ? `完成！單號 ${result.orderNo}，找零 NT$ ${result.change}${result.reused ? "（重複請求，已沿用既有訂單）" : ""}`
                : result.message}
            </div>
          )}

          {lastReceipt && (
            <Button
              variant="outline"
              onClick={() => printReceipt(lastReceipt)}
              className="h-11 w-full"
            >
              列印收據（單號 {lastReceipt.orderNo}）
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
