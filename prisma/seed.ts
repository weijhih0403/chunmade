import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const account1 = {
    username: process.env.SEED_USERNAME_1?.trim(),
    password: process.env.SEED_PASSWORD_1,
  };
  const account2 = {
    username: process.env.SEED_USERNAME_2?.trim(),
    password: process.env.SEED_PASSWORD_2,
  };

  if (
    !account1.username ||
    !account1.password ||
    !account2.username ||
    !account2.password
  ) {
    throw new Error(
      "請在 .env 設定 SEED_USERNAME_1/2 與 SEED_PASSWORD_1/2（僅用於本機種子，勿提交）。",
    );
  }

  if (account1.username === account2.username) {
    throw new Error("SEED_USERNAME_1 與 SEED_USERNAME_2 不可相同。");
  }

  await prisma.user.deleteMany();

  await prisma.user.create({
    data: {
      username: account1.username,
      passwordHash: await bcrypt.hash(account1.password, 12),
      status: "APPROVED",
      isAdmin: true,
      approvedAt: new Date(),
    },
  });

  await prisma.user.create({
    data: {
      username: account2.username,
      passwordHash: await bcrypt.hash(account2.password, 12),
      status: "APPROVED",
      isAdmin: false,
      approvedAt: new Date(),
    },
  });
}

main()
  .then(() => {
    console.log(
      `種子完成：僅保留 2 組帳號（已核准），其中 ${process.env.SEED_USERNAME_1?.trim()} 為管理者`,
    );
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
