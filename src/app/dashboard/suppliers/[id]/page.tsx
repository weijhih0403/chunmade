import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/permissions";
import { getSupplier } from "@/modules/purchasing/service";
import { deleteSupplierAction } from "@/modules/purchasing/actions";
import { BackButton } from "@/components/layout/back-button";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";

export const dynamic = "force-dynamic";

export default async function SupplierDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const actor = await requirePermission("purchase.read");
  const supplier = await getSupplier(actor, id);
  if (!supplier) notFound();
  const canManage = actor.permissions.has("purchase.manage");

  return (
    <div className="space-y-4">
      <BackButton fallbackHref="/dashboard/suppliers" />
      <PageHeader title={supplier.name} description={`代碼：${supplier.code}`} />

      <Card>
        <CardContent className="space-y-2 pt-4 text-sm">
          <p>
            <span className="text-gray-500">聯絡人：</span>
            {supplier.contact ?? "—"}
          </p>
          <p>
            <span className="text-gray-500">電話：</span>
            {supplier.phone ?? "—"}
          </p>
          <p>
            <span className="text-gray-500">Email：</span>
            {supplier.email ?? "—"}
          </p>
        </CardContent>
      </Card>

      {canManage && (
        <div className="flex flex-wrap gap-3">
          <Link
            href={`/dashboard/suppliers/${id}/edit`}
            className="inline-flex h-10 items-center rounded-lg bg-amber-600 px-4 text-sm font-medium text-white hover:bg-amber-700"
          >
            編輯
          </Link>
          <form action={deleteSupplierAction}>
            <input type="hidden" name="supplierId" value={supplier.id} />
            <ConfirmSubmitButton
              variant="outline"
              confirmMessage={`確定要刪除供應商「${supplier.name}」？`}
              pendingText="刪除中…"
            >
              <span className="text-red-600">刪除</span>
            </ConfirmSubmitButton>
          </form>
        </div>
      )}
    </div>
  );
}
