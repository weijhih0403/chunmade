import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// 倉庫代碼 -> 對應門市代碼（每家店一個倉庫）
const MAP = [
  { whCode: "W01", storeCode: "S01" },
  { whCode: "W02", storeCode: "S02" },
  { whCode: "W03", storeCode: "S03" },
  { whCode: "W04", storeCode: "S04" },
  { whCode: "W05", storeCode: "S05" },
];

async function main() {
  const company = await prisma.company.findFirst({ where: { isActive: true } });
  if (!company) throw new Error("找不到啟用中的公司");

  for (const m of MAP) {
    const store = await prisma.store.findUnique({
      where: { companyId_code: { companyId: company.id, code: m.storeCode } },
    });
    if (!store) {
      console.log(`SKIP ${m.whCode}（找不到門市 ${m.storeCode}）`);
      continue;
    }
    const name = `${store.name}倉庫`;
    const result = await prisma.warehouse.upsert({
      where: { companyId_code: { companyId: company.id, code: m.whCode } },
      create: {
        companyId: company.id,
        storeId: store.id,
        code: m.whCode,
        name,
        isActive: true,
      },
      update: { storeId: store.id, name, isActive: true, deletedAt: null },
    });
    console.log(`OK ${result.code} ${result.name} (門市：${store.name})`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
