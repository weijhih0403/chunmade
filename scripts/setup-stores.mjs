import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const company = await prisma.company.findFirst({ where: { isActive: true } });
  if (!company) throw new Error("找不到啟用中的公司");

  const stores = [
    { code: "S01", name: "淺草" },
    { code: "S02", name: "水堆淳手作" },
    { code: "S03", name: "台北灣淳手作" },
    { code: "S04", name: "竹圍淳手作" },
    { code: "S05", name: "義山淳手作" },
  ];

  for (const s of stores) {
    const result = await prisma.store.upsert({
      where: { companyId_code: { companyId: company.id, code: s.code } },
      create: { companyId: company.id, code: s.code, name: s.name, isActive: true },
      update: { name: s.name, isActive: true, deletedAt: null },
    });
    console.log(`OK ${result.code} -> ${result.name}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
