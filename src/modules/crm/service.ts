import "server-only";
import { prisma } from "@/lib/db";
import { type Actor, companyScope } from "@/lib/permissions";

export async function listCustomers(actor: Actor) {
  const scope = companyScope(actor);
  return prisma.customer.findMany({
    where: { ...scope, deletedAt: null },
    include: { member: true },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
}

export async function getCustomer(actor: Actor, id: string) {
  const scope = companyScope(actor);
  const customer = await prisma.customer.findFirst({
    where: { ...scope, id },
    include: {
      member: {
        include: {
          loyaltyTransactions: { orderBy: { createdAt: "desc" }, take: 20 },
          storedValueTransactions: { orderBy: { createdAt: "desc" }, take: 20 },
        },
      },
    },
  });
  return customer;
}
