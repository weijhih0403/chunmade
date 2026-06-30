import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();
const D = (v) => new Prisma.Decimal(v);

const BEAN_NAMES = ["黃豆", "紅豆", "綠豆", "花豆"];

async function main() {
  const company = await prisma.company.findFirst({ where: { isActive: true } });
  if (!company) throw new Error("找不到啟用中的公司");

  // 1) 建立 / 取得「包」單位
  const bag = await prisma.unit.upsert({
    where: { companyId_code: { companyId: company.id, code: "bag" } },
    create: { companyId: company.id, code: "bag", name: "包" },
    update: { name: "包" },
  });
  console.log(`單位「包」就緒（id=${bag.id}）`);

  // 2) 找出豆類品項
  const items = await prisma.item.findMany({
    where: { companyId: company.id, deletedAt: null, name: { in: BEAN_NAMES } },
    select: { id: true, name: true, sku: true },
  });
  const foundNames = new Set(items.map((i) => i.name));
  for (const n of BEAN_NAMES) {
    if (!foundNames.has(n)) console.log(`⚠ 找不到品項：${n}`);
  }

  for (const it of items) {
    // 改單位為「包」，並把以公克計的補貨點/安全庫存歸零
    await prisma.item.update({
      where: { id: it.id },
      data: { baseUnitId: bag.id, reorderPoint: D(0), safetyStock: D(0) },
    });

    // 把舊的公克庫存歸零（避免被當成「包」造成盤點差異）
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
    console.log(`OK ${it.sku} ${it.name} → 單位改為「包」，庫存/補貨點歸零（${balances.length} 筆庫存）`);
  }

  console.log(`\n完成：共處理 ${items.length} 種豆類`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
