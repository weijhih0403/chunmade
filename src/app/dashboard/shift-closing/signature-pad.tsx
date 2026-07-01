"use client";

import { useEffect, useRef, useState, useCallback, useImperativeHandle, forwardRef } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Point = { x: number; y: number };

export type SignaturePadHandle = {
  clear: () => void;
  getDataUrl: () => string | null;
};

type SignaturePadProps = {
  onChange?: (dataUrl: string | null) => void;
  className?: string;
  /** 填滿父層高度（全螢幕模式用） */
  fill?: boolean;
  /** 手機用較粗筆跡 */
  thickStroke?: boolean;
};

export const SignaturePad = forwardRef<SignaturePadHandle, SignaturePadProps>(function SignaturePad(
  { onChange, className, fill = false, thickStroke = false },
  ref,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const lastPoint = useRef<Point | null>(null);
  const hasStrokeRef = useRef(false);
  const [hasStroke, setHasStroke] = useState(false);

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const rect = container.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) return;

    const dpr = window.devicePixelRatio || 1;
    const w = Math.floor(rect.width * dpr);
    const h = Math.floor(rect.height * dpr);

    if (canvas.width === w && canvas.height === h) return;

    const prev = hasStrokeRef.current ? canvas.toDataURL("image/png") : null;
    canvas.width = w;
    canvas.height = h;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, h);

    if (prev) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, w, h);
      };
      img.src = prev;
    }
  }, []);

  useEffect(() => {
    resizeCanvas();
    const ro = new ResizeObserver(() => resizeCanvas());
    if (containerRef.current) ro.observe(containerRef.current);
    window.addEventListener("orientationchange", resizeCanvas);
    return () => {
      ro.disconnect();
      window.removeEventListener("orientationchange", resizeCanvas);
    };
  }, [resizeCanvas]);

  const getPoint = useCallback((e: React.PointerEvent<HTMLCanvasElement>): Point => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  }, []);

  const lineWidth = thickStroke ? 6 : 4;

  const drawLine = useCallback(
    (from: Point, to: Point) => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (!ctx || !canvas) return;
      const rect = canvas.getBoundingClientRect();
      const dpr = canvas.width / rect.width;
      ctx.strokeStyle = "#111827";
      ctx.lineWidth = lineWidth * dpr;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.stroke();
    },
    [lineWidth],
  );

  const emitChange = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !hasStrokeRef.current) {
      onChange?.(null);
      return;
    }
    onChange?.(canvas.toDataURL("image/png"));
  }, [onChange]);

  function handlePointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    drawing.current = true;
    lastPoint.current = getPoint(e);
    hasStrokeRef.current = true;
    setHasStroke(true);
  }

  function handlePointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current || !lastPoint.current) return;
    e.preventDefault();
    const pt = getPoint(e);
    drawLine(lastPoint.current, pt);
    lastPoint.current = pt;
  }

  function handlePointerUp(e: React.PointerEvent<HTMLCanvasElement>) {
    e.preventDefault();
    drawing.current = false;
    lastPoint.current = null;
    emitChange();
  }

  function clear() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    hasStrokeRef.current = false;
    setHasStroke(false);
    onChange?.(null);
  }

  useImperativeHandle(ref, () => ({
    clear,
    getDataUrl: () => (hasStrokeRef.current ? (canvasRef.current?.toDataURL("image/png") ?? null) : null),
  }));

  return (
    <div ref={containerRef} className={cn(fill ? "h-full min-h-0 w-full" : "space-y-2", className)}>
      <div
        className={cn(
          "overflow-hidden bg-white",
          fill ? "h-full rounded-md border border-gray-200" : "rounded-xl border-2 border-dashed border-gray-300",
        )}
      >
        <canvas
          ref={canvasRef}
          className={cn(
            "w-full touch-none cursor-crosshair",
            fill ? "h-full" : "h-48 sm:h-56",
          )}
          style={{ touchAction: "none" }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        />
      </div>
      {!fill && (
        <>
          <p className="text-center text-xs text-gray-400">請在框內手寫簽名（支援手指或滑鼠）</p>
          <Button type="button" variant="outline" size="sm" onClick={clear} disabled={!hasStroke}>
            清除重簽
          </Button>
        </>
      )}
    </div>
  );
});
