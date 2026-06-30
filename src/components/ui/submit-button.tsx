"use client";

import { useFormStatus } from "react-dom";
import { Button, type ButtonProps } from "@/components/ui/button";

/**
 * 送出按鈕：在表單送出（pending）期間自動禁用並顯示等待文字，
 * 避免反應較慢時使用者連點造成重複送出 / 重複建單。
 * 必須作為 <form> 的子元素使用。
 */
export function SubmitButton({
  children,
  pendingText = "處理中…",
  ...props
}: ButtonProps & { pendingText?: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} aria-busy={pending} {...props}>
      {pending ? pendingText : children}
    </Button>
  );
}
