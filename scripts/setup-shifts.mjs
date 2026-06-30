import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const company = await prisma.company.findFirst({ where: { isActive: true } });
  if (!company) throw new Error("找不到啟用中的公司");

  const store = await prisma.store.findFirst({
    where: { companyId: company.id, deletedAt: null },
    orderBy: { createdAt: "asc" },
  });

  const shifts = [
    { code: "MORNING", name: "早班", startTime: "10:00", endTime: "17:00" },
    { code: "EVENING", name: "晚班", startTime: "17:00", endTime: "23:00" },
    { code: "MIDDAY", name: "插班", startTime: "13:00", endTime: "20:00" },
  ];

  for (const s of shifts) {
    const result = await prisma.shift.upsert({
      where: { companyId_code: { companyId: company.id, code: s.code } },
      create: {
        companyId: company.id,
        storeId: store?.id ?? null,
        code: s.code,
        name: s.name,
        startTime: s.startTime,
        endTime: s.endTime,
        isActive: true,
      },
      update: {
        name: s.name,
        startTime: s.startTime,
        endTime: s.endTime,
        isActive: true,
        deletedAt: null,
      },
    });
    console.log(`OK ${result.name} (${result.code}) ${result.startTime}-${result.endTime}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
