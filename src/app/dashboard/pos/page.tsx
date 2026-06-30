import { requirePermission } from "@/lib/permissions";
import { getPosCatalog, getPosContext } from "@/modules/pos/service";
import { PageHeader } from "@/components/layout/page-header";
import { PosClient } from "./pos-client";

export const dynamic = "force-dynamic";

export default async function PosPage() {
  const actor = await requirePermission("pos.operate");
  const [catalog, ctx] = await Promise.all([getPosCatalog(actor), getPosContext(actor)]);

  return (
    <div>
      <PageHeader title="POS 結帳" description={`門市：${ctx.storeName}`} />
      <PosClient products={catalog} storeName={ctx.storeName} />
    </div>
  );
}
