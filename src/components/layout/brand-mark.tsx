import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

export function BrandMark({
  collapsed = false,
  centered = false,
  showSystemTitle = false,
  className,
}: {
  collapsed?: boolean;
  centered?: boolean;
  /** 側欄用：小圖示 + 「淳手作管理系統」 */
  showSystemTitle?: boolean;
  className?: string;
}) {
  if (showSystemTitle && !centered) {
    return (
      <Link
        href="/dashboard"
        className={cn(
          "flex min-w-0 items-center overflow-hidden transition-[gap] duration-200 ease-out",
          collapsed ? "justify-center" : "gap-2",
          className,
        )}
        title="淳手作管理系統"
      >
        <Image
          src="/brand-icon.png"
          alt="淳手作"
          width={36}
          height={36}
          className="h-9 w-9 shrink-0 object-contain"
          priority
        />
        <span
          className={cn(
            "truncate text-sm font-bold leading-snug text-amber-900 transition-[max-width,opacity] duration-200 ease-out",
            collapsed ? "max-w-0 opacity-0" : "max-w-[9rem] opacity-100",
          )}
        >
          淳手作管理系統
        </span>
      </Link>
    );
  }

  return (
    <Link
      href="/dashboard"
      className={cn("flex min-w-0 shrink-0 items-center", centered && "justify-center", className)}
      title="淳手作"
    >
      <Image
        src={collapsed ? "/brand-icon.png" : "/brand-logo.png"}
        alt="淳手作圓仔湯"
        width={collapsed ? 36 : centered ? 200 : 160}
        height={collapsed ? 36 : centered ? 56 : 48}
        className={cn(
          "object-contain transition-[width,height] duration-200 ease-out",
          centered ? "mx-auto h-14 w-auto max-w-[14rem]" : "object-left",
          collapsed ? "h-9 w-9" : !centered && "h-10 w-auto max-w-[10.5rem]",
        )}
        priority
      />
    </Link>
  );
}
