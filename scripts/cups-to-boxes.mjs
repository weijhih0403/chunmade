import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();
const D = (v) => new Prisma.Decimal(v);

/** 包材杯類（外帶杯、700杯…）改為以「箱」計數；銷售商品不變 */
function isCupPackItem(item) {
  if (item.type !== "RAW_MATERIAL") return false;
  if (item.name === "外帶杯") return true;
  return /^\d+杯$/.test(item.name);
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
    select: { id: true, sku: true, name: true, type: true },
    orderBy: { sku: "asc" },
  });

  const cups = items.filter(isCupPackItem);
  if (cups.length === 0) {
    console.log("找不到包材杯類品項");
    return;
  }

  console.log(`將 ${cups.length} 種杯子改為「箱」…\n`);

  for (const it of cups) {
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

  console.log(`\n完成：共 ${cups.length} 種杯子`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
