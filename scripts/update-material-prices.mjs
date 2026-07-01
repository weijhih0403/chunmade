/**
 * 批次更新原物料標準成本（Item.standardCost）
 * 用法：node scripts/update-material-prices.mjs
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/** 名稱 → 標準成本（進貨成本） */
const COSTS = {
  芋圓: 300,
  地瓜圓: 275,
  紫地瓜: 275,
  Q圓: 275,
  湯圓: 470,
  粉圓: 135,
  粉條: 180,
  粉角: 275,
  剉冰糖水: 160,
  蜜花生: 340,
  桂圓: 610,
  仙草汁: 110,
  黑糖漿: 370,
  粉粿: 80,
  大薏仁: 230,
  熟片: 700,
  杏仁: 145,
  布丁: 240,
  麥角: 145,
  花豆: 180,
  綠豆: 200,
  特砂: 120,
  紫米: 200,
  冬瓜茶: 250,
  酸梅湯: 150,
  仙草凍: 420,
  冰淇淋: 510,
  雪綿冰: 150,
  冬瓜磚: 600,
  紅茶: 300,
  米苔目: 30,
  紅豆糖包: 40,
  煉乳: 155,
  奶水: 50,
  奶精: 150,
  波波球: 310,
  三色蒟蒻: 210,
  鳳梨椰果: 220,
  芋頭: 340,
  地瓜: 1,
  椰奶: 50,
  糖糕粉: 50,
  抹茶粉: 300,
  吉利T: 640,
  芋頭粉: 70,
  泰奶: 50,
  抹奶: 50,
  紅豆: 2750,
  二砂: 1800,
  黑糖: 1290,
  生片: 600,
  豆花: 500,
  牛奶: 110,
  蒜味花生: 1,
  烏梅汁: 230,
  鳳梨汁: 240,
  桂花釀: 185,
  鳳梨: 200,
  百香醬: 350,
  草莓醬: 375,
  烏梅醬: 350,
  芒果醬: 265,
  焦糖醬: 330,
  K750湯碗: 1680,
  "850碗": 1930,
  "700杯": 2820,
  "500杯": 1160,
  "1000杯": 1830,
  "6585蓋": 360,
  "850平蓋": 440,
  "142凸蓋": 540,
  "吸管(大)": 560,
  "吸管(小)": 560,
  大圓湯匙: 1750,
  湯匙: 400,
  仙草乾: 180,
  奶油球: 760,
  米酒: 35,
  白話梅: 120,
  麥芽糖: 350,
  地瓜粉: 75,
  薑汁: 35,
  膠膜: 35,
};

async function main() {
  const company = await prisma.company.findFirst({ where: { isActive: true } });
  if (!company) throw new Error("找不到啟用中的公司");

  const items = await prisma.item.findMany({
    where: {
      companyId: company.id,
      deletedAt: null,
      type: { in: ["RAW_MATERIAL", "SEMI_FINISHED"] },
    },
    select: { id: true, sku: true, name: true, price: true, standardCost: true },
  });

  let updated = 0;
  const notInList = [];
  const notFound = [];

  for (const item of items) {
    const cost = COSTS[item.name];
    if (cost === undefined) {
      notInList.push(item.name);
      continue;
    }
    const currentCost = Number(item.standardCost);
    const currentPrice = Number(item.price);
    const needCost = currentCost !== cost;
    const needResetPrice = currentPrice !== 0;
    if (!needCost && !needResetPrice) continue;

    await prisma.item.update({
      where: { id: item.id },
      data: {
        standardCost: cost,
        price: 0,
      },
    });
    console.log(
      `✓ ${item.sku} ${item.name}：成本 ${currentCost} → ${cost}` +
        (needResetPrice ? `，售價 ${currentPrice} → 0` : ""),
    );
    updated++;
  }

  for (const name of Object.keys(COSTS)) {
    if (!items.some((it) => it.name === name)) notFound.push(name);
  }

  console.log(`\n完成：更新 ${updated} 筆標準成本（原物料售價已歸零）`);
  if (notFound.length) {
    console.log(`\n清單中有但資料庫無此原物料（${notFound.length}）：`);
    console.log(notFound.join("、"));
  }
  if (notInList.length) {
    console.log(`\n資料庫有但未提供成本（${notInList.length}，維持原值）：`);
    console.log(notInList.join("、"));
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
