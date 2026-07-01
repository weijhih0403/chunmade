import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

export function BrandMark({
  collapsed = false,
  centered = false,
  className,
}: {
  collapsed?: boolean;
  centered?: boolean;
  className?: string;
}) {
  return (
    <Link
      href="/dashboard"
      className={cn("flex min-w-0 shrink-0 items-center", centered && "justify-center", className)}
      title="淳手作"
    >
      <Image
        src="/brand-logo.png"
        alt="淳手作圓仔湯"
        width={collapsed ? 36 : centered ? 200 : 160}
        height={collapsed ? 36 : centered ? 56 : 48}
        className={cn(
          "object-contain",
          centered ? "mx-auto h-14 w-auto max-w-[14rem]" : "object-left",
          !centered && (collapsed ? "h-9 w-9" : "h-10 w-auto max-w-[10.5rem]"),
        )}
        priority
      />
    </Link>
  );
}
