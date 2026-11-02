"use client";

import { ProductKitsManager } from '@/components/admin/ProductKitsManager';
import { AdminPageHeader } from '@/components/admin/AdminPrimitives';

export default function AdminKitsPage() {
  return (
    <div className="space-y-6">
      <AdminPageHeader title="Kits" description="Crie kits com SKU, saldo, preço, foto e composição livre de produtos avulsos." />
      <ProductKitsManager />
    </div>
  );
}
