import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const PHONES = {
  S01: "02-8631-0489", // 淺草
  S02: "02-2626-5216", // 水堆淳手作
  S03: "02-2629-9099", // 台北灣淳手作
  S04: "02-2808-0113", // 竹圍淳手作
};

async function main() {
  const company = await prisma.company.findFirst({ where: { isActive: true } });
  if (!company) throw new Error("找不到啟用中的公司");

  for (const [code, phone] of Object.entries(PHONES)) {
    const result = await prisma.store.update({
      where: { companyId_code: { companyId: company.id, code } },
      data: { phone },
    });
    console.log(`OK ${result.code} ${result.name} -> ${result.phone}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
