import { prisma } from "@/lib/prisma";
import { InventoryTable } from "./inventory-table";

export default async function InventoryPage() {
  const items = await prisma.inventoryItem.findMany({
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="space-y-10">
      <div>
        <h1 className="font-display text-3xl font-medium tracking-tight text-[var(--foreground)]">
          庫存
        </h1>
        <p className="mt-2 max-w-2xl text-[var(--muted)]">
          管理品項數量與備註；資料儲存在本機資料庫。
        </p>
      </div>

      <InventoryTable items={items} />
    </div>
  );
}
