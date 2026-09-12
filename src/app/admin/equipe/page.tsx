"use client";

import { AdminEmptyState, AdminPageHeader } from '@/components/admin/AdminPrimitives';

export default function AdminTeamPage() {
  return (
    <div className="space-y-6">
      <AdminPageHeader title="Equipe & Acessos" description="Gerencie promotores, vendedores e permissões do sistema." />

      <div className="admin-surface p-4 sm:p-6">
        <AdminEmptyState icon="shield_person" title="Gestão de acessos em preparação" description="A interface será ativada junto com o modelo completo de RBAC. Até lá, os acessos continuam protegidos pela allowlist administrativa." />
      </div>
    </div>
  );
}
