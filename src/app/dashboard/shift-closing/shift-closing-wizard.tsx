"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { createShiftClosingAction } from "@/modules/shift-closing/actions";
import { initialFormState } from "@/lib/forms";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { formatDate } from "@/lib/dates";
import { SignaturePad, type SignaturePadHandle } from "./signature-pad";

type StoreOpt = { id: string; name: string };

type QtyState = { qty520: number; qty850: number; qty700: number; qty500: number };

type Step = "quantities" | "signature" | "confirm";

export function ShiftClosingWizard({
  stores,
  defaultDate,
}: {
  stores: StoreOpt[];
  defaultDate: string;
}) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("quantities");
  const [storeId, setStoreId] = useState(stores[0]?.id ?? "");
  const [closingDate, setClosingDate] = useState(defaultDate);
  const [qty, setQty] = useState<QtyState>({ qty520: 0, qty850: 0, qty700: 0, qty500: 0 });
  const [signatureData, setSignatureData] = useState<string | null>(null);

  const signaturePadRef = useRef<SignaturePadHandle>(null);
  const fullscreenRef = useRef<HTMLDivElement>(null);
  const [portalReady, setPortalReady] = useState(false);
  const [state, formAction, pending] = useActionState(createShiftClosingAction, initialFormState);

  useEffect(() => {
    setPortalReady(true);
  }, []);

  useEffect(() => {
    if (step !== "signature") return;

    const scrollY = window.scrollY;
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.left = "0";
    document.body.style.right = "0";
    document.body.style.overflow = "hidden";
    document.body.style.width = "100%";

    const el = fullscreenRef.current;
    void el?.requestFullscreen?.().catch(() => {});

    history.pushState({ signatureLock: true }, "");
    const onPopState = () => {
      history.pushState({ signatureLock: true }, "");
    };
    window.addEventListener("popstate", onPopState);

    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", onBeforeUnload);

    return () => {
      window.removeEventListener("popstate", onPopState);
      window.removeEventListener("beforeunload", onBeforeUnload);
      if (document.fullscreenElement === el) {
        void document.exitFullscreen?.().catch(() => {});
      }
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.left = "";
      document.body.style.right = "";
      document.body.style.overflow = "";
      document.body.style.width = "";
      window.scrollTo(0, scrollY);
    };
  }, [step]);

  useEffect(() => {
    if (state.ok) {
      const t = setTimeout(() => router.refresh(), 600);
      return () => clearTimeout(t);
    }
  }, [state.ok, router]);

  function updateQty(key: keyof QtyState, value: number) {
    setQty((p) => ({ ...p, [key]: Math.max(0, value) }));
  }

  function finishSignature() {
    if (!signatureData) return;
    setStep("confirm");
  }

  if (state.ok) {
    return (
      <div className="mx-auto max-w-lg rounded-xl border border-green-200 bg-green-50 p-6 text-center">
        <p className="text-lg font-semibold text-green-800">班結表已送出</p>
        <p className="mt-2 text-sm text-green-700">{state.message}</p>
        <Button className="mt-4" onClick={() => window.location.reload()}>
          填寫下一張
        </Button>
      </div>
    );
  }

  if (step === "quantities") {
    return (
      <div className="mx-auto max-w-lg space-y-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label htmlFor="storeId">門市</Label>
            <Select id="storeId" value={storeId} onChange={(e) => setStoreId(e.target.value)}>
              {stores.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="closingDate">班結日期</Label>
            <Input
              id="closingDate"
              type="date"
              value={closingDate}
              onChange={(e) => setClosingDate(e.target.value)}
            />
            <p className="mt-1 text-xs text-gray-400">預設今日 {formatDate(new Date(defaultDate))}</p>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="mb-3 text-sm font-medium text-gray-700">剩餘容器數量（請輸入實際盤點數）</p>
          <div className="grid grid-cols-2 gap-4">
            {(
              [
                ["qty520", "520 碗"],
                ["qty850", "850 碗"],
                ["qty700", "700 杯"],
                ["qty500", "500 杯"],
              ] as const
            ).map(([key, label]) => (
              <div key={key}>
                <Label htmlFor={key}>{label}</Label>
                <Input
                  id={key}
                  type="number"
                  min={0}
                  step={1}
                  inputMode="numeric"
                  value={qty[key]}
                  onChange={(e) => updateQty(key, Number(e.target.value) || 0)}
                  className="text-lg font-semibold"
                />
              </div>
            ))}
          </div>
        </div>

        <Button type="button" className="w-full" size="lg" onClick={() => setStep("signature")} disabled={!storeId}>
          下一步：手寫簽名
        </Button>
      </div>
    );
  }

  if (step === "signature") {
    if (!portalReady) return null;
    return createPortal(
      <div
        ref={fullscreenRef}
        className="fixed inset-0 z-[9999] flex flex-col bg-white touch-none"
        style={{ touchAction: "none", height: "100dvh", width: "100vw" }}
      >
        <header className="shrink-0 border-b border-gray-200 px-4 py-2 pt-[max(0.5rem,env(safe-area-inset-top))]">
          <p className="text-center text-base font-semibold text-gray-900">手寫簽名</p>
          <p className="mt-0.5 text-center text-xs text-gray-500">
            請在下方全螢幕區域簽名，完成後按「完成簽名」才能離開
          </p>
        </header>

        <div className="min-h-0 flex-1 px-2 py-2">
          <SignaturePad ref={signaturePadRef} fill thickStroke onChange={setSignatureData} />
        </div>

        <footer className="shrink-0 space-y-2 border-t border-gray-200 bg-white px-4 py-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <Button
            type="button"
            variant="outline"
            className="w-full"
            disabled={!signatureData}
            onClick={() => {
              signaturePadRef.current?.clear();
              setSignatureData(null);
            }}
          >
            清除重簽
          </Button>
          <Button
            type="button"
            className="w-full"
            size="lg"
            disabled={!signatureData}
            onClick={finishSignature}
          >
            完成簽名
          </Button>
        </footer>
      </div>,
      document.body,
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <p className="text-sm font-medium text-gray-700">簽名預覽</p>
        {signatureData && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={signatureData}
            alt="簽名"
            className="mx-auto mt-3 max-h-32 rounded border bg-white"
          />
        )}
        <p className="mt-3 text-xs text-gray-500">
          520碗 {qty.qty520} · 850碗 {qty.qty850} · 700杯 {qty.qty700} · 500杯 {qty.qty500}
        </p>
      </div>

      <form action={formAction} className="space-y-4">
        <input type="hidden" name="storeId" value={storeId} />
        <input type="hidden" name="closingDate" value={closingDate} />
        <input type="hidden" name="qty520" value={qty.qty520} />
        <input type="hidden" name="qty850" value={qty.qty850} />
        <input type="hidden" name="qty700" value={qty.qty700} />
        <input type="hidden" name="qty500" value={qty.qty500} />
        <input type="hidden" name="signatureData" value={signatureData ?? ""} />

        {state.message && !state.ok && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.message}</p>
        )}

        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={() => setStep("signature")}>
            重簽
          </Button>
          <Button type="submit" className="flex-1" disabled={pending || !signatureData}>
            {pending ? "送出中…" : "確認送出班結表"}
          </Button>
        </div>
      </form>
    </div>
  );
}
