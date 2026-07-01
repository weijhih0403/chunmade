/**
 * 將指定原物料的計量單位改為「箱」
 * 用法：node scripts/update-packaging-units.mjs
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/** 單位應為「箱」的品項名稱 */
const BOX_UNIT_NAMES = [
  "850碗",
  "K750湯碗",
  "吸管(大)",
  "吸管(小)",
  "大圓湯匙",
  "奶油球",
  "奶精",
  "湯匙",
];

async function main() {
  const company = await prisma.company.findFirst({ where: { isActive: true } });
  if (!company) throw new Error("找不到啟用中的公司");

  const unitBox = await prisma.unit.findFirst({
    where: { companyId: company.id, code: "box" },
  });
  if (!unitBox) throw new Error("找不到單位『箱 (box)』");

  let updated = 0;
  const notFound = [];

  for (const name of BOX_UNIT_NAMES) {
    const item = await prisma.item.findFirst({
      where: { companyId: company.id, name, deletedAt: null },
      select: {
        id: true,
        sku: true,
        name: true,
        baseUnit: { select: { name: true } },
      },
    });

    if (!item) {
      notFound.push(name);
      continue;
    }

    if (item.baseUnit.name === "箱") {
      console.log(`— ${item.sku} ${item.name}：已是「箱」`);
      continue;
    }

    await prisma.item.update({
      where: { id: item.id },
      data: { baseUnitId: unitBox.id },
    });
    console.log(`✓ ${item.sku} ${item.name}：${item.baseUnit.name} → 箱`);
    updated++;
  }

  console.log(`\n完成：更新 ${updated} 筆單位為「箱」`);
  if (notFound.length) {
    console.log(`\n資料庫找不到（${notFound.length}）：${notFound.join("、")}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
