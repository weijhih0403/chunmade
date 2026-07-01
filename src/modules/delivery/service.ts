import "server-only";
import { prisma } from "@/lib/db";
import { startOfBusinessDay } from "@/lib/dates";
import { type Actor, assertStoreAccess, companyScope } from "@/lib/permissions";
import { getYesterdayOrderPreview } from "./generate-from-count";

export type StoreDeliveryRow = {
  store: { id: string; name: string; code: string };
  note: {
    id: string;
    deliveryNo: string;
    status: string;
    total: number;
    delivered: number;
  } | null;
  preview: {
    countDateLabel: string;
    countNos: string[];
    orderItemCount: number;
    hasWarehouse: boolean;
    hasCount: boolean;
  };
};

export async function listStoresWithTodayDeliveries(actor: Actor): Promise<StoreDeliveryRow[]> {
  const scope = companyScope(actor);
  const today = startOfBusinessDay();

  const stores = await prisma.store.findMany({
    where: { ...scope, deletedAt: null, isActive: true },
    orderBy: { code: "asc" },
  });

  const visibleStores = stores.filter((s) => {
    try {
      assertStoreAccess(actor, s.id);
      return true;
    } catch {
      return false;
    }
  });

  const notes = await prisma.deliveryNote.findMany({
    where: {
      ...scope,
      deletedAt: null,
      deliveryDate: today,
      storeId: { in: visibleStores.map((s) => s.id) },
    },
    include: {
      items: true,
      store: { select: { name: true, code: true } },
    },
  });

  const noteByStore = new Map(notes.map((n) => [n.storeId, n]));

  const rows: StoreDeliveryRow[] = [];
  for (const store of visibleStores) {
    const note = noteByStore.get(store.id);
    const total = note?.items.length ?? 0;
    const delivered = note?.items.filter((i) => i.isDelivered).length ?? 0;
    const preview = await getYesterdayOrderPreview(actor, store.id);
    rows.push({
      store,
      note: note
        ? {
            id: note.id,
            deliveryNo: note.deliveryNo,
            status: note.status,
            total,
            delivered,
          }
        : null,
      preview,
    });
  }
  return rows;
}

export async function getDeliveryNote(actor: Actor, id: string) {
  const scope = companyScope(actor);
  const note = await prisma.deliveryNote.findFirst({
    where: { ...scope, id, deletedAt: null },
    include: {
      store: true,
      items: {
        include: {
          item: { include: { baseUnit: true } },
        },
        orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
      },
    },
  });
  if (!note) return null;
  assertStoreAccess(actor, note.storeId);
  return note;
}

export async function listDeliveryFormItems(actor: Actor) {
  const scope = companyScope(actor);
  return prisma.item.findMany({
    where: {
      ...scope,
      deletedAt: null,
      isActive: true,
      type: { in: ["RAW_MATERIAL", "SEMI_FINISHED", "FINISHED_GOOD"] },
    },
    include: { baseUnit: true },
    orderBy: { name: "asc" },
    take: 500,
  });
}

export async function listDeliveryStores(actor: Actor) {
  const scope = companyScope(actor);
  const stores = await prisma.store.findMany({
    where: { ...scope, deletedAt: null, isActive: true },
    orderBy: { code: "asc" },
  });
  return stores.filter((s) => {
    try {
      assertStoreAccess(actor, s.id);
      return true;
    } catch {
      return false;
    }
  });
}
