import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/permissions";
import { getSupplier } from "@/modules/purchasing/service";
import { BackButton } from "@/components/layout/back-button";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { SupplierForm } from "../../supplier-form";

export const dynamic = "force-dynamic";

export default async function EditSupplierPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const actor = await requirePermission("purchase.manage");
  const supplier = await getSupplier(actor, id);
  if (!supplier) notFound();

  return (
    <div className="space-y-4">
      <BackButton fallbackHref="/dashboard/suppliers" />
      <PageHeader title={`編輯供應商 - ${supplier.name}`} description={`代碼：${supplier.code}`} />
      <Card>
        <CardContent>
          <SupplierForm
            defaults={{
              id: supplier.id,
              code: supplier.code,
              name: supplier.name,
              contact: supplier.contact,
              phone: supplier.phone,
              email: supplier.email,
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
