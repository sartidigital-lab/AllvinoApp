import { ProductKitsManager } from '@/components/admin/ProductKitsManager';
import { AdminPageHeader } from '@/components/admin/AdminPrimitives';

type AdminKitsPageProps = {
  searchParams: Promise<{ edit?: string | string[] }>;
};

export default async function AdminKitsPage({ searchParams }: AdminKitsPageProps) {
  const { edit } = await searchParams;
  const initialKitId = typeof edit === 'string' ? edit : undefined;

  return (
    <div className="space-y-6">
      <AdminPageHeader title="Kits" description="Crie kits com SKU, saldo, preço, foto e composição livre de produtos avulsos." />
      <ProductKitsManager initialKitId={initialKitId} />
    </div>
  );
}
