"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Tesseract from "tesseract.js";
import { createShiftClosingAction } from "@/modules/shift-closing/actions";
import {
  cleanOcrText,
  matchSignatureToEmployee,
  rankEmployeesBySignature,
} from "@/modules/shift-closing/match-signature";
import { preprocessSignatureForOcr } from "@/modules/shift-closing/preprocess-signature";
import { initialFormState } from "@/lib/forms";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { formatDate } from "@/lib/dates";
import { SignaturePad, type SignaturePadHandle } from "./signature-pad";

type StoreOpt = { id: string; name: string };
type EmpOpt = { id: string; name: string };

type QtyState = { qty520: number; qty850: number; qty700: number; qty500: number };

type Step = "quantities" | "signature" | "result";

export function ShiftClosingWizard({
  stores,
  employees,
  defaultDate,
}: {
  stores: StoreOpt[];
  employees: EmpOpt[];
  defaultDate: string;
}) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("quantities");
  const [storeId, setStoreId] = useState(stores[0]?.id ?? "");
  const [closingDate, setClosingDate] = useState(defaultDate);
  const [qty, setQty] = useState<QtyState>({ qty520: 0, qty850: 0, qty700: 0, qty500: 0 });
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [recognizing, setRecognizing] = useState(false);
  const [recognizedText, setRecognizedText] = useState("");
  const [signerName, setSignerName] = useState("");
  const [matchedEmployeeId, setMatchedEmployeeId] = useState("");
  const [ocrConfidence, setOcrConfidence] = useState<number | null>(null);
  const [ocrError, setOcrError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<{ id: string; name: string; score: number }[]>(
    [],
  );

  const signaturePadRef = useRef<SignaturePadHandle>(null);
  const [state, formAction, pending] = useActionState(createShiftClosingAction, initialFormState);

  /** 簽名全螢幕時鎖住背景捲動，避免手機書寫時頁面跟著動 */
  useEffect(() => {
    if (step !== "signature") return;
    const scrollY = window.scrollY;
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.left = "0";
    document.body.style.right = "0";
    document.body.style.overflow = "hidden";
    document.body.style.width = "100%";
    return () => {
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

  function goToSignature() {
    if (!storeId) return;
    setStep("signature");
  }

  async function recognizeSignature() {
    if (!signatureData) {
      setOcrError("請先簽名");
      return;
    }
    setRecognizing(true);
    setOcrError(null);
    try {
      const processed = await preprocessSignatureForOcr(signatureData);
      const worker = await Tesseract.createWorker("chi_tra");
      await worker.setParameters({
        tessedit_pageseg_mode: Tesseract.PSM.SINGLE_LINE,
      });
      const { data } = await worker.recognize(processed);
      await worker.terminate();
      const cleaned = cleanOcrText(data.text);
      const confidence = data.confidence;
      setRecognizedText(cleaned);
      setOcrConfidence(confidence);

      const ranked = rankEmployeesBySignature(cleaned, employees);
      setSuggestions(ranked.map((r) => ({ ...r.employee, score: r.score })));

      const { employee, score } = matchSignatureToEmployee(cleaned, employees);
      if (employee && score >= 40) {
        setSignerName(employee.name);
        setMatchedEmployeeId(employee.id);
      } else if (ranked[0]) {
        setSignerName(ranked[0].employee.name);
        setMatchedEmployeeId(ranked[0].employee.id);
      } else if (cleaned) {
        setSignerName(cleaned);
        setMatchedEmployeeId("");
      } else {
        setSignerName("");
        setMatchedEmployeeId("");
        setOcrError("無法辨識簽名，請點選下方員工姓名");
      }
      setStep("result");
    } catch {
      setOcrError("辨識失敗，請手動輸入簽名人姓名");
      setStep("result");
    } finally {
      setRecognizing(false);
    }
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
            <Select
              id="storeId"
              value={storeId}
              onChange={(e) => setStoreId(e.target.value)}
            >
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

        <Button type="button" className="w-full" size="lg" onClick={goToSignature} disabled={!storeId}>
          下一步：手寫簽名
        </Button>
      </div>
    );
  }

  if (step === "signature") {
    return (
      <div
        className="fixed inset-0 z-[100] flex flex-col bg-white touch-none"
        style={{ touchAction: "none" }}
      >
        <header className="shrink-0 border-b border-gray-200 px-4 py-3 safe-area-inset-top">
          <p className="text-center text-base font-semibold text-gray-900">手寫簽名</p>
          <p className="mt-1 text-center text-xs text-gray-500">
            520碗 {qty.qty520} · 850碗 {qty.qty850} · 700杯 {qty.qty700} · 500杯 {qty.qty500}
          </p>
        </header>

        <div className="min-h-0 flex-1 p-3">
          <SignaturePad ref={signaturePadRef} fill thickStroke onChange={setSignatureData} />
        </div>

        {ocrError && (
          <p className="shrink-0 px-4 text-center text-sm text-red-600">{ocrError}</p>
        )}

        <footer className="shrink-0 space-y-2 border-t border-gray-200 bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <div className="flex gap-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setStep("quantities")}>
              上一步
            </Button>
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              disabled={!signatureData}
              onClick={() => {
                signaturePadRef.current?.clear();
                setSignatureData(null);
              }}
            >
              清除重簽
            </Button>
          </div>
          <Button
            type="button"
            className="w-full"
            size="lg"
            disabled={!signatureData || recognizing}
            onClick={recognizeSignature}
          >
            {recognizing ? "辨識簽名中…" : "完成簽名並辨識"}
          </Button>
        </footer>
      </div>
    );
  }

  // step === "result"
  return (
    <div className="mx-auto max-w-lg space-y-4">
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
        <p className="text-sm font-medium text-amber-900">簽名辨識結果</p>
        {signatureData && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={signatureData}
            alt="簽名"
            className="mt-2 mx-auto max-h-24 rounded border bg-white"
          />
        )}
        <dl className="mt-3 space-y-1 text-sm">
          <div className="flex gap-2">
            <dt className="text-gray-500">辨識文字：</dt>
            <dd className="font-medium text-gray-900">{recognizedText || "（未辨識出文字）"}</dd>
          </div>
          {ocrConfidence != null && (
            <div className="flex gap-2">
              <dt className="text-gray-500">信心度：</dt>
              <dd>{ocrConfidence.toFixed(0)}%</dd>
            </div>
          )}
        </dl>
        {suggestions.length > 0 && (
          <div className="mt-3">
            <p className="text-xs text-gray-500">建議簽名人（點選確認）</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {suggestions.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    setSignerName(s.name);
                    setMatchedEmployeeId(s.id);
                  }}
                  className={`rounded-full px-3 py-1.5 text-sm ${
                    matchedEmployeeId === s.id
                      ? "bg-gray-900 text-white"
                      : "bg-white border border-gray-300 text-gray-800 hover:bg-gray-50"
                  }`}
                >
                  {s.name}
                </button>
              ))}
            </div>
          </div>
        )}
        {ocrError && <p className="mt-2 text-xs text-amber-800">{ocrError}</p>}
      </div>

      <form action={formAction} className="space-y-4">
        <input type="hidden" name="storeId" value={storeId} />
        <input type="hidden" name="closingDate" value={closingDate} />
        <input type="hidden" name="qty520" value={qty.qty520} />
        <input type="hidden" name="qty850" value={qty.qty850} />
        <input type="hidden" name="qty700" value={qty.qty700} />
        <input type="hidden" name="qty500" value={qty.qty500} />
        <input type="hidden" name="signatureData" value={signatureData ?? ""} />
        <input type="hidden" name="recognizedText" value={recognizedText} />
        <input type="hidden" name="ocrConfidence" value={ocrConfidence ?? ""} />
        <input type="hidden" name="matchedEmployeeId" value={matchedEmployeeId} />

        <div>
          <Label htmlFor="signerName">簽名人（可修改，建議直接點選上方建議）</Label>
          <Input
            id="signerName"
            name="signerName"
            required
            value={signerName}
            onChange={(e) => setSignerName(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="matchedEmployeeIdSelect">對應員工（選填）</Label>
          <Select
            id="matchedEmployeeIdSelect"
            value={matchedEmployeeId}
            onChange={(e) => {
              const id = e.target.value;
              setMatchedEmployeeId(id);
              const emp = employees.find((x) => x.id === id);
              if (emp) setSignerName(emp.name);
            }}
          >
            <option value="">（手動輸入或非員工）</option>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </Select>
        </div>

        {state.message && !state.ok && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.message}</p>
        )}

        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={() => setStep("signature")}>
            重簽
          </Button>
          <Button type="submit" className="flex-1" disabled={pending || !signerName.trim()}>
            {pending ? "送出中…" : "確認送出班結表"}
          </Button>
        </div>
      </form>
    </div>
  );
}
