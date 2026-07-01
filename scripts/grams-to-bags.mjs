import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();
const D = (v) => new Prisma.Decimal(v);

/** 將所有以「公克」為計量單位的品項改為「包」，並歸零庫存／補貨點 */
async function main() {
  const company = await prisma.company.findFirst({ where: { isActive: true } });
  if (!company) throw new Error("找不到啟用中的公司");

  const gram = await prisma.unit.findFirst({
    where: { companyId: company.id, code: "g" },
  });
  if (!gram) throw new Error("找不到單位「公克 (g)」");

  const bag = await prisma.unit.upsert({
    where: { companyId_code: { companyId: company.id, code: "bag" } },
    create: { companyId: company.id, code: "bag", name: "包" },
    update: { name: "包" },
  });

  const items = await prisma.item.findMany({
    where: { companyId: company.id, deletedAt: null, baseUnitId: gram.id },
    select: { id: true, name: true, sku: true },
    orderBy: { sku: "asc" },
  });

  if (items.length === 0) {
    console.log("沒有使用「公克」的品項，無需轉換。");
    return;
  }

  console.log(`找到 ${items.length} 筆公克品項，改為「包」…\n`);

  for (const it of items) {
    await prisma.item.update({
      where: { id: it.id },
      data: { baseUnitId: bag.id, reorderPoint: D(0), safetyStock: D(0) },
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

    console.log(`OK ${it.sku} ${it.name} → 包（庫存歸零 ${balances.length} 筆）`);
  }

  // 豆漿配方：黃豆改以「包」計，用量 120g → 1 包
  const soybean = await prisma.item.findFirst({
    where: { companyId: company.id, sku: "RAW-SOYBEAN", deletedAt: null },
  });
  if (soybean) {
    const recipeItems = await prisma.recipeItem.findMany({
      where: { companyId: company.id, materialId: soybean.id },
    });
    for (const ri of recipeItems) {
      if (ri.quantity.greaterThan(1)) {
        await prisma.recipeItem.update({
          where: { id: ri.id },
          data: { quantity: D(1) },
        });
        console.log(`\n配方原料 ${soybean.name} 用量 ${ri.quantity} → 1 包`);
      }
    }
  }

  console.log(`\n完成：共轉換 ${items.length} 種品項`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
