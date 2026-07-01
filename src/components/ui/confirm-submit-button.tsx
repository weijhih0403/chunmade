"use client";

import { useFormStatus } from "react-dom";
import { Button, type ButtonProps } from "@/components/ui/button";

export function ConfirmSubmitButton({
  children,
  pendingText = "處理中…",
  confirmMessage = "確定要執行此操作？",
  ...props
}: ButtonProps & { pendingText?: string; confirmMessage?: string }) {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      onClick={(e) => {
        if (!window.confirm(confirmMessage)) e.preventDefault();
      }}
      {...props}
    >
      {pending ? pendingText : children}
    </Button>
  );
}
