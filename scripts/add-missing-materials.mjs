import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// 使用者提供的完整清單（會自動去重）
const RAW_NAMES = [
  "芋圓", "地瓜圓", "紫地瓜", "Q圓", "湯圓", "粉圓", "粉條", "粉角",
  "剉冰糖水", "蜜花生", "桂圓", "仙草汁", "黑糖漿", "粉粿", "大薏仁",
  "熟片", "杏仁", "布丁", "麥角", "花豆", "綠豆", "特砂", "紫米",
  "仙草茶", "冬瓜茶", "酸梅湯", "仙草凍", "冰淇淋", "雪綿冰", "冬瓜磚",
  "紅茶", "米苔目", "仙草包", "紅豆糖包", "煉乳", "奶水", "奶精", "波波球",
  "三色蒟蒻", "鳳梨椰果", "芋頭", "地瓜",
  "椰奶", "糖糕粉", "抹茶粉", "吉利T", "芋頭粉", "泰奶", "抹奶", "紅豆",
  "二砂", "黑糖", "生片", "豆花", "牛奶", "豆漿", "蒜味花生", "大薏仁",
  "烏梅汁", "鳳梨汁", "桂花釀", "鳳梨", "百香醬", "草莓醬", "烏梅醬",
  "芒果醬", "焦糖醬",
  "K750湯碗", "850碗", "700杯", "500杯", "1000杯", "6585蓋", "850平蓋",
  "142凸蓋", "吸管(大)", "吸管(小)", "大圓湯匙", "湯匙", "塑膠袋",
  "仙草乾", "奶油球", "米酒", "白話梅", "麥芽糖", "瓦斯", "冰塊", "地瓜粉",
  "薑汁", "膠膜",
];

async function main() {
  const company = await prisma.company.findFirst({ where: { isActive: true } });
  if (!company) throw new Error("找不到啟用中的公司");

  const unitBag = await prisma.unit.findFirst({ where: { companyId: company.id, code: "bag" } });
  if (!unitBag) throw new Error("找不到單位『包 (bag)』");

  const catRaw = await prisma.category.findFirst({ where: { companyId: company.id, code: "RAW" } });

  // 去重，保留輸入順序
  const wanted = [...new Set(RAW_NAMES.map((n) => n.trim()).filter(Boolean))];

  // 現有所有未刪除品項名稱（不分類型，避免重複建立）
  const existingItems = await prisma.item.findMany({
    where: { companyId: company.id, deletedAt: null },
    select: { name: true, sku: true },
  });
  const existingNames = new Set(existingItems.map((it) => it.name));

  // 找出目前最大的 ING-xxx 流水號，從後面接續
  let maxIng = 0;
  for (const it of existingItems) {
    const m = /^ING-(\d+)$/.exec(it.sku);
    if (m) maxIng = Math.max(maxIng, Number(m[1]));
  }

  const missing = wanted.filter((n) => !existingNames.has(n));
  const present = wanted.filter((n) => existingNames.has(n));

  console.log(`清單共 ${wanted.length} 種（去重後）`);
  console.log(`已存在 ${present.length} 種，缺少 ${missing.length} 種`);
  if (present.length) console.log(`\n已存在：\n  ${present.join("、")}`);
  console.log("");

  let i = maxIng;
  let created = 0;
  for (const name of missing) {
    i++;
    const sku = `ING-${String(i).padStart(3, "0")}`;
    await prisma.item.create({
      data: {
        companyId: company.id,
        sku,
        name,
        type: "RAW_MATERIAL",
        baseUnitId: unitBag.id,
        categoryId: catRaw?.id ?? null,
        price: 0,
        isActive: true,
        trackStock: true,
      },
    });
    created++;
    console.log(`NEW ${sku} ${name}`);
  }

  console.log(`\n完成：新增 ${created} 筆原物料`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
