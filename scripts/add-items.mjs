import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const NAMES = [
  "芋圓", "地瓜圓", "紫地瓜", "Q圓", "湯圓", "粉圓", "粉條", "粉角",
  "剉冰糖水", "蜜花生", "桂圓", "仙草汁", "黑糖漿", "粉粿", "大薏仁",
  "熟片", "杏仁", "布丁", "麥角", "花豆", "綠豆", "特砂", "紫米",
  "仙草茶", "冬瓜茶", "酸梅湯", "仙草凍", "冰淇淋", "雪綿冰", "冬瓜磚",
  "紅茶", "米苔目", "仙草包", "紅豆糖包", "煉乳", "奶水", "奶精", "波波球",
  "三色蒟蒻", "鳳梨椰果", "芋頭", "地瓜",
];

async function main() {
  const company = await prisma.company.findFirst({ where: { isActive: true } });
  if (!company) throw new Error("找不到啟用中的公司");

  const unitG = await prisma.unit.findFirst({ where: { companyId: company.id, code: "g" } });
  if (!unitG) throw new Error("找不到單位『公克 (g)』");

  const catRaw = await prisma.category.findFirst({ where: { companyId: company.id, code: "RAW" } });

  let i = 1;
  let created = 0;
  let updated = 0;
  for (const name of NAMES) {
    const sku = `ING-${String(i).padStart(3, "0")}`;
    const existing = await prisma.item.findUnique({
      where: { companyId_sku: { companyId: company.id, sku } },
      select: { id: true },
    });
    await prisma.item.upsert({
      where: { companyId_sku: { companyId: company.id, sku } },
      create: {
        companyId: company.id,
        sku,
        name,
        type: "RAW_MATERIAL",
        baseUnitId: unitG.id,
        categoryId: catRaw?.id ?? null,
        price: 0,
        isActive: true,
        trackStock: true,
      },
      update: { name },
    });
    if (existing) updated++;
    else created++;
    console.log(`${existing ? "UPD" : "NEW"} ${sku} ${name}`);
    i++;
  }
  console.log(`\n完成：新增 ${created} 筆、更新 ${updated} 筆，共 ${NAMES.length} 筆`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
