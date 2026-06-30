"use client";

import { useRouter } from "next/navigation";

export function BackButton({
  fallbackHref = "/dashboard",
  label = "回上一頁",
}: {
  fallbackHref?: string;
  label?: string;
}) {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => {
        if (typeof window !== "undefined" && window.history.length > 1) {
          router.back();
        } else {
          router.push(fallbackHref);
        }
      }}
      className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-amber-700"
    >
      <span aria-hidden>←</span>
      {label}
    </button>
  );
}
