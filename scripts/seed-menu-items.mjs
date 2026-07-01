import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/** 依店內菜單建立 POS 販售品項（價格先為 0） */
const CATEGORIES = [
  { code: "ZHUANGNAI", name: "撞奶鮮奶", sortOrder: 1 },
  { code: "AIYU", name: "愛玉仙草", sortOrder: 2 },
  { code: "SUMMER_TEA", name: "消暑茶", sortOrder: 3 },
  { code: "SHAVE_ICE", name: "剉冰", sortOrder: 4 },
  { code: "DOUHUA", name: "豆花", sortOrder: 5 },
  { code: "WINTER", name: "冬季限定", sortOrder: 6 },
];

const MENU = [
  {
    code: "ZHUANGNAI",
    items: [
      "青蛙撞奶",
      "仙蛙撞奶",
      "綠蛙撞奶",
      "紅蛙撞奶",
      "仙草撞奶",
      "綠豆鮮奶",
      "紅豆鮮奶",
      "綜合撞奶",
      "Q奶嫩仙草",
    ],
  },
  {
    code: "AIYU",
    items: ["愛玉粉圓", "檸檬愛玉", "仙草粉圓", "綠豆粉圓", "仙草蜜"],
  },
  {
    code: "SUMMER_TEA",
    items: [
      "小時候紅茶",
      "冰釀酸梅湯",
      "黑糖仙草茶",
      "家傳冬瓜茶",
      "仙草冬瓜茶",
      "檸檬冬瓜茶",
      "紅茶鮮奶茶",
      "冬瓜鮮奶茶",
    ],
  },
  {
    code: "SHAVE_ICE",
    items: [
      "手炒黑糖清冰",
      "黑糖綜合剉冰",
      "牛奶雪綿冰",
      "芒果雪綿冰",
      "復古花生牛奶冰",
      "萬丹紅豆牛奶冰",
      "大甲芋頭牛奶冰",
      "新鮮芒果牛奶冰",
      "新鮮芒果雪綿冰",
    ],
  },
  {
    code: "DOUHUA",
    items: [
      "花生豆花",
      "粉圓豆花",
      "綠豆豆花",
      "紅豆豆花",
      "花豆豆花",
      "綜合豆花",
      "豆漿豆花奶",
      "泰式豆花奶",
      "抹茶豆花奶",
      "薏仁豆花",
    ],
  },
  {
    code: "WINTER",
    items: ["綜合燒仙草", "綜合紅豆湯", "綜合桂圓湯", "綜合花生湯"],
  },
];

async function main() {
  const company = await prisma.company.findFirst({ where: { isActive: true } });
  if (!company) throw new Error("找不到啟用中的公司");

  const cup = await prisma.unit.findFirst({
    where: { companyId: company.id, code: "cup" },
  });
  if (!cup) throw new Error("找不到單位「杯」");

  const catByCode = new Map();
  for (const c of CATEGORIES) {
    const cat = await prisma.category.upsert({
      where: { companyId_code: { companyId: company.id, code: c.code } },
      create: {
        companyId: company.id,
        code: c.code,
        name: c.name,
        sortOrder: c.sortOrder,
      },
      update: { name: c.name, sortOrder: c.sortOrder, isActive: true, deletedAt: null },
    });
    catByCode.set(c.code, cat);
    console.log(`分類 ${c.code} ${c.name}`);
  }

  let created = 0;
  let updated = 0;

  for (const group of MENU) {
    const category = catByCode.get(group.code);
    if (!category) continue;

    for (let i = 0; i < group.items.length; i++) {
      const name = group.items[i];
      const sku = `MENU-${group.code}-${String(i + 1).padStart(3, "0")}`;

      const byName = await prisma.item.findFirst({
        where: { companyId: company.id, name, deletedAt: null },
      });

      if (byName) {
        await prisma.item.update({
          where: { id: byName.id },
          data: {
            categoryId: category.id,
            type: "SALE_ITEM",
            isActive: true,
            trackStock: false,
          },
        });
        updated++;
        console.log(`UPD ${byName.sku} ${name} → ${category.name}`);
        continue;
      }

      const bySku = await prisma.item.findUnique({
        where: { companyId_sku: { companyId: company.id, sku } },
      });

      if (bySku) {
        await prisma.item.update({
          where: { id: bySku.id },
          data: {
            name,
            categoryId: category.id,
            type: "SALE_ITEM",
            isActive: true,
            trackStock: false,
            deletedAt: null,
          },
        });
        updated++;
        console.log(`UPD ${sku} ${name}`);
        continue;
      }

      await prisma.item.create({
        data: {
          companyId: company.id,
          sku,
          name,
          type: "SALE_ITEM",
          categoryId: category.id,
          baseUnitId: cup.id,
          price: 0,
          standardCost: 0,
          trackStock: false,
          isActive: true,
        },
      });
      created++;
      console.log(`NEW ${sku} ${name}`);
    }
  }

  console.log(`\n完成：新增 ${created} 筆、更新 ${updated} 筆販售品項（價格皆為 0，待後續設定）`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
