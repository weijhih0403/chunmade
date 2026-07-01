import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/** 豆漿→瓶、膠膜(封膜)→個、粉粿→鍋 */
const UNIT_CHANGES = [
  { unitCode: "bottle", unitName: "瓶", itemNames: ["豆漿(半成品)", "豆漿", "古早味豆漿"] },
  { unitCode: "pcs", unitName: "個", itemNames: ["膠膜", "封膜"] },
  { unitCode: "pot", unitName: "鍋", itemNames: ["粉粿"] },
];

async function main() {
  const company = await prisma.company.findFirst({ where: { isActive: true } });
  if (!company) throw new Error("找不到啟用中的公司");

  for (const rule of UNIT_CHANGES) {
    const unit = await prisma.unit.upsert({
      where: { companyId_code: { companyId: company.id, code: rule.unitCode } },
      create: { companyId: company.id, code: rule.unitCode, name: rule.unitName },
      update: { name: rule.unitName },
    });

    for (const name of rule.itemNames) {
      const items = await prisma.item.findMany({
        where: { companyId: company.id, deletedAt: null, name },
        select: { id: true, sku: true, name: true },
      });
      if (items.length === 0) {
        console.log(`⚠ 找不到品項：${name}`);
        continue;
      }
      for (const it of items) {
        await prisma.item.update({
          where: { id: it.id },
          data: { baseUnitId: unit.id },
        });
        console.log(`OK ${it.sku} ${it.name} → ${rule.unitName}`);
      }
    }
  }

  console.log("\n單位調整完成");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
