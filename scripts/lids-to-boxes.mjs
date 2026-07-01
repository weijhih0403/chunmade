import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();
const D = (v) => new Prisma.Decimal(v);

/** 杯蓋類品項改為以「箱」計數 */
function isLidItem(name) {
  return name === "杯蓋" || name.endsWith("蓋") || name.includes("平蓋") || name.includes("凸蓋");
}

async function main() {
  const company = await prisma.company.findFirst({ where: { isActive: true } });
  if (!company) throw new Error("找不到啟用中的公司");

  const box = await prisma.unit.upsert({
    where: { companyId_code: { companyId: company.id, code: "box" } },
    create: { companyId: company.id, code: "box", name: "箱" },
    update: { name: "箱" },
  });

  const items = await prisma.item.findMany({
    where: { companyId: company.id, deletedAt: null },
    select: { id: true, sku: true, name: true, baseUnitId: true },
    orderBy: { sku: "asc" },
  });

  const lids = items.filter((it) => isLidItem(it.name));
  if (lids.length === 0) {
    console.log("找不到杯蓋類品項");
    return;
  }

  console.log(`將 ${lids.length} 種杯蓋改為「箱」…\n`);

  for (const it of lids) {
    await prisma.item.update({
      where: { id: it.id },
      data: { baseUnitId: box.id, reorderPoint: D(0), safetyStock: D(0) },
    });

    const balances = await prisma.stockBalance.findMany({
      where: { itemId: it.id },
      select: { id: true, quantity: true },
    });
    for (const b of balances) {
      if (!b.quantity.equals(0)) {
        await prisma.stockBalance.update({
          where: { id: b.id },
          data: { quantity: D(0) },
        });
      }
    }

    console.log(`OK ${it.sku} ${it.name} → 箱`);
  }

  console.log(`\n完成：共 ${lids.length} 種杯蓋`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
