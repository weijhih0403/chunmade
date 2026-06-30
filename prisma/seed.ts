import { PrismaClient, Prisma, RoleName } from "@prisma/client";
import bcrypt from "bcryptjs";
import { PERMISSION_DEFS, ROLE_PERMISSIONS } from "../src/lib/permissions/catalog";
import { ROLE_LABELS } from "../src/lib/constants";

const prisma = new PrismaClient();
const D = (v: number | string) => new Prisma.Decimal(v);

const DEV_PASSWORD = "Password123";

async function main() {
  console.log("🌱 開始建立種子資料…");

  // 1) 權限
  for (const p of PERMISSION_DEFS) {
    await prisma.permission.upsert({
      where: { key: p.key },
      create: { key: p.key, label: p.label, module: p.module },
      update: { label: p.label, module: p.module },
    });
  }

  // 2) 角色 + 角色權限
  const roleNames = Object.keys(ROLE_PERMISSIONS) as RoleName[];
  for (const name of roleNames) {
    const role = await prisma.role.upsert({
      where: { name },
      create: { name, label: ROLE_LABELS[name], isSystem: true },
      update: { label: ROLE_LABELS[name] },
    });

    const perms = ROLE_PERMISSIONS[name];
    const keys =
      perms === "*" ? PERMISSION_DEFS.map((p) => p.key) : (perms as readonly string[]);
    const permRecords = await prisma.permission.findMany({ where: { key: { in: [...keys] } } });
    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
    await prisma.rolePermission.createMany({
      data: permRecords.map((pr) => ({ roleId: role.id, permissionId: pr.id })),
      skipDuplicates: true,
    });
  }
  const roleByName = {} as Record<RoleName, { id: string }>;
  for (const r of await prisma.role.findMany()) {
    roleByName[r.name] = { id: r.id };
  }

  // 3) 公司 / 門市 / 倉庫
  const company = await prisma.company.upsert({
    where: { id: "seed-company" },
    create: {
      id: "seed-company",
      name: "淳手作",
      taxId: "00000000",
      phone: "02-1234-5678",
      timezone: "Asia/Taipei",
      currency: "TWD",
    },
    update: {},
  });

  const store1 = await prisma.store.upsert({
    where: { companyId_code: { companyId: company.id, code: "S01" } },
    create: { companyId: company.id, code: "S01", name: "淳手作 本店", phone: "02-1111-1111" },
    update: {},
  });
  const store2 = await prisma.store.upsert({
    where: { companyId_code: { companyId: company.id, code: "S02" } },
    create: { companyId: company.id, code: "S02", name: "淳手作 分店", phone: "02-2222-2222" },
    update: {},
  });

  const wh1 = await prisma.warehouse.upsert({
    where: { companyId_code: { companyId: company.id, code: "W01" } },
    create: { companyId: company.id, storeId: store1.id, code: "W01", name: "本店倉庫" },
    update: {},
  });
  const wh2 = await prisma.warehouse.upsert({
    where: { companyId_code: { companyId: company.id, code: "W02" } },
    create: { companyId: company.id, storeId: store2.id, code: "W02", name: "分店倉庫" },
    update: {},
  });

  // 4) 使用者
  const passwordHash = await bcrypt.hash(DEV_PASSWORD, 10);
  async function createUser(
    email: string,
    name: string,
    roles: RoleName[],
    storeIds: string[],
  ) {
    const user = await prisma.user.upsert({
      where: { email },
      create: {
        email,
        name,
        passwordHash,
        companyId: company.id,
        status: "APPROVED",
        approvedAt: new Date(),
      },
      update: { status: "APPROVED", companyId: company.id },
    });
    await prisma.userRole.deleteMany({ where: { userId: user.id } });
    for (const r of roles) {
      await prisma.userRole.create({
        data: { userId: user.id, roleId: roleByName[r].id, storeId: null },
      });
    }
    await prisma.storeUser.deleteMany({ where: { userId: user.id } });
    for (const sid of storeIds) {
      await prisma.storeUser.create({ data: { userId: user.id, storeId: sid } });
    }
    return user;
  }

  const owner = await createUser("owner@chun.local", "王老闆", ["OWNER"], []);
  await createUser("admin@chun.local", "系統管理員", ["ADMIN"], []);
  const manager = await createUser("manager@chun.local", "陳店長", ["MANAGER"], [store1.id]);
  await createUser("cashier1@chun.local", "收銀小美", ["CASHIER"], [store1.id]);
  await createUser("cashier2@chun.local", "收銀阿明", ["CASHIER"], [store2.id]);
  await createUser("warehouse@chun.local", "倉庫大雄", ["WAREHOUSE"], [store1.id]);
  await createUser("production@chun.local", "製作師傅", ["PRODUCTION"], [store1.id]);
  await createUser("staff1@chun.local", "工讀生 A", ["STAFF"], [store1.id]);
  await createUser("staff2@chun.local", "工讀生 B", ["STAFF"], [store2.id]);

  // 5) 部門 / 職位 / 聘僱類型
  const empType = await prisma.employmentType.create({
    data: { companyId: company.id, name: "正職" },
  });
  await prisma.employmentType.create({ data: { companyId: company.id, name: "兼職" } });
  const dept = await prisma.department.create({ data: { companyId: company.id, name: "門市部" } });
  const position = await prisma.position.create({ data: { companyId: company.id, name: "門市人員" } });

  // 員工資料（與店長帳號連結）
  await prisma.employee.upsert({
    where: { companyId_employeeNo: { companyId: company.id, employeeNo: "E001" } },
    create: {
      companyId: company.id,
      userId: manager.id,
      employeeNo: "E001",
      name: "陳店長",
      departmentId: dept.id,
      positionId: position.id,
      employmentTypeId: empType.id,
      primaryStoreId: store1.id,
      hourlyRate: D(220),
      hireDate: new Date("2025-01-01"),
    },
    update: {},
  });

  // 6) 班別
  await prisma.shift.upsert({
    where: { companyId_code: { companyId: company.id, code: "MORNING" } },
    create: {
      companyId: company.id,
      storeId: store1.id,
      code: "MORNING",
      name: "早班",
      startTime: "08:00",
      endTime: "16:00",
    },
    update: {},
  });
  await prisma.shift.upsert({
    where: { companyId_code: { companyId: company.id, code: "EVENING" } },
    create: {
      companyId: company.id,
      storeId: store1.id,
      code: "EVENING",
      name: "晚班",
      startTime: "14:00",
      endTime: "22:00",
    },
    update: {},
  });

  // 7) 付款方式
  const paymentMethods = [
    { method: "CASH" as const, label: "現金" },
    { method: "CREDIT_CARD" as const, label: "信用卡" },
    { method: "LINE_PAY" as const, label: "LINE Pay" },
    { method: "MOBILE_PAY" as const, label: "行動支付" },
  ];
  for (const [i, pm] of paymentMethods.entries()) {
    await prisma.paymentMethodConfig.upsert({
      where: { companyId_method: { companyId: company.id, method: pm.method } },
      create: { companyId: company.id, method: pm.method, label: pm.label, sortOrder: i },
      update: {},
    });
  }

  // 8) 單位
  async function unit(code: string, name: string) {
    return prisma.unit.upsert({
      where: { companyId_code: { companyId: company.id, code } },
      create: { companyId: company.id, code, name },
      update: {},
    });
  }
  const uG = await unit("g", "公克");
  const uKg = await unit("kg", "公斤");
  const uMl = await unit("ml", "毫升");
  const uL = await unit("L", "公升");
  const uCup = await unit("cup", "杯");
  const uPcs = await unit("pcs", "個");

  await prisma.unitConversion.createMany({
    data: [
      { companyId: company.id, fromUnitId: uKg.id, toUnitId: uG.id, factor: D(1000) },
      { companyId: company.id, fromUnitId: uL.id, toUnitId: uMl.id, factor: D(1000) },
    ],
    skipDuplicates: true,
  });

  // 9) 分類
  async function category(code: string, name: string) {
    return prisma.category.upsert({
      where: { companyId_code: { companyId: company.id, code } },
      create: { companyId: company.id, code, name },
      update: {},
    });
  }
  const catDrink = await category("DRINK", "飲品");
  const catDessert = await category("DOUHUA", "豆花");
  const catRaw = await category("RAW", "原料");
  const catPack = await category("PACK", "包材");

  // 10) 商品
  type ItemSeed = {
    sku: string;
    name: string;
    type: "RAW_MATERIAL" | "SEMI_FINISHED" | "FINISHED_GOOD" | "SALE_ITEM";
    unitId: string;
    categoryId: string;
    price?: number;
    cost?: number;
    track?: boolean;
    reorder?: number;
    safety?: number;
    shelfLife?: number;
  };
  const itemSeeds: ItemSeed[] = [
    { sku: "RAW-SOYBEAN", name: "黃豆", type: "RAW_MATERIAL", unitId: uG.id, categoryId: catRaw.id, cost: 0.08, reorder: 5000, safety: 2000 },
    { sku: "RAW-SUGAR", name: "砂糖", type: "RAW_MATERIAL", unitId: uG.id, categoryId: catRaw.id, cost: 0.03, reorder: 3000, safety: 1000 },
    { sku: "RAW-WATER", name: "水", type: "RAW_MATERIAL", unitId: uMl.id, categoryId: catRaw.id, cost: 0.001, track: false },
    { sku: "PACK-CUP", name: "外帶杯", type: "RAW_MATERIAL", unitId: uPcs.id, categoryId: catPack.id, cost: 1.5, reorder: 500, safety: 200 },
    { sku: "PACK-LID", name: "杯蓋", type: "RAW_MATERIAL", unitId: uPcs.id, categoryId: catPack.id, cost: 0.8, reorder: 500, safety: 200 },
    { sku: "SEMI-SOYMILK", name: "豆漿(半成品)", type: "SEMI_FINISHED", unitId: uMl.id, categoryId: catRaw.id, cost: 0, shelfLife: 2 },
    { sku: "SEMI-SYRUP", name: "糖水(半成品)", type: "SEMI_FINISHED", unitId: uMl.id, categoryId: catRaw.id, cost: 0, shelfLife: 7 },
    { sku: "FG-TOFU", name: "傳統豆花", type: "FINISHED_GOOD", unitId: uCup.id, categoryId: catDessert.id, price: 45, cost: 0, shelfLife: 1, reorder: 20, safety: 10 },
    { sku: "SALE-SOYMILK", name: "古早味豆漿", type: "SALE_ITEM", unitId: uCup.id, categoryId: catDrink.id, price: 35, cost: 0, shelfLife: 1, reorder: 20, safety: 10 },
  ];

  const itemMap: Record<string, { id: string }> = {};
  for (const s of itemSeeds) {
    const it = await prisma.item.upsert({
      where: { companyId_sku: { companyId: company.id, sku: s.sku } },
      create: {
        companyId: company.id,
        sku: s.sku,
        name: s.name,
        type: s.type,
        categoryId: s.categoryId,
        baseUnitId: s.unitId,
        price: D(s.price ?? 0),
        standardCost: D(s.cost ?? 0),
        trackStock: s.track ?? true,
        reorderPoint: D(s.reorder ?? 0),
        safetyStock: D(s.safety ?? 0),
        shelfLifeDays: s.shelfLife ?? null,
      },
      update: {},
    });
    itemMap[s.sku] = it;
  }
  const mustItem = (sku: string): string => {
    const it = itemMap[sku];
    if (!it) throw new Error(`找不到商品 ${sku}`);
    return it.id;
  };

  // 11) 配方
  // 豆漿：黃豆 120g + 水 1000ml → 產出 1000ml
  const soymilkRecipe = await prisma.recipe.create({
    data: { companyId: company.id, productId: mustItem("SEMI-SOYMILK"), name: "古法豆漿配方" },
  });
  const soymilkVer = await prisma.recipeVersion.create({
    data: { companyId: company.id, recipeId: soymilkRecipe.id, version: 1, outputQty: D(1000) },
  });
  await prisma.recipeItem.createMany({
    data: [
      { companyId: company.id, versionId: soymilkVer.id, materialId: mustItem("RAW-SOYBEAN"), quantity: D(120), wasteRate: D(0.02) },
      { companyId: company.id, versionId: soymilkVer.id, materialId: mustItem("RAW-WATER"), quantity: D(1000) },
    ],
  });

  // 豆花：豆漿 250ml + 糖水 30ml + 杯 1 + 蓋 1 → 產出 1 杯
  const tofuRecipe = await prisma.recipe.create({
    data: { companyId: company.id, productId: mustItem("FG-TOFU"), name: "傳統豆花配方" },
  });
  const tofuVer = await prisma.recipeVersion.create({
    data: { companyId: company.id, recipeId: tofuRecipe.id, version: 1, outputQty: D(1) },
  });
  await prisma.recipeItem.createMany({
    data: [
      { companyId: company.id, versionId: tofuVer.id, materialId: mustItem("SEMI-SOYMILK"), quantity: D(250) },
      { companyId: company.id, versionId: tofuVer.id, materialId: mustItem("SEMI-SYRUP"), quantity: D(30) },
      { companyId: company.id, versionId: tofuVer.id, materialId: mustItem("PACK-CUP"), quantity: D(1) },
      { companyId: company.id, versionId: tofuVer.id, materialId: mustItem("PACK-LID"), quantity: D(1) },
    ],
  });

  // 12) 供應商
  await prisma.supplier.upsert({
    where: { companyId_code: { companyId: company.id, code: "SUP01" } },
    create: { companyId: company.id, code: "SUP01", name: "大豐食品原料行", phone: "02-3333-3333", contact: "李先生" },
    update: {},
  });
  await prisma.supplier.upsert({
    where: { companyId_code: { companyId: company.id, code: "SUP02" } },
    create: { companyId: company.id, code: "SUP02", name: "永盛包材", phone: "02-4444-4444", contact: "張小姐" },
    update: {},
  });

  // 13) 期初庫存（建立 StockBalance + INITIAL 異動）
  async function setInitialStock(sku: string, warehouseId: string, qty: number, cost: number) {
    const item = itemMap[sku];
    if (!item) return;
    await prisma.stockBalance.create({
      data: {
        companyId: company.id,
        itemId: item.id,
        warehouseId,
        quantity: D(qty),
        avgCost: D(cost),
      },
    });
    await prisma.stockMovement.create({
      data: {
        companyId: company.id,
        warehouseId,
        itemId: item.id,
        type: "INITIAL",
        quantity: D(qty),
        direction: 1,
        unitCost: D(cost),
        quantityBefore: D(0),
        quantityAfter: D(qty),
        sourceType: "INITIAL",
        reason: "期初庫存",
        operatorId: owner.id,
      },
    });
  }
  await setInitialStock("RAW-SOYBEAN", wh1.id, 10000, 0.08);
  await setInitialStock("RAW-SUGAR", wh1.id, 5000, 0.03);
  await setInitialStock("PACK-CUP", wh1.id, 1000, 1.5);
  await setInitialStock("PACK-LID", wh1.id, 1000, 0.8);
  // 故意讓杯子接近補貨點以展示低庫存提醒
  await setInitialStock("FG-TOFU", wh1.id, 8, 18);

  console.log("✅ 種子資料建立完成。");
  console.log(`   開發帳號密碼皆為：${DEV_PASSWORD}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
