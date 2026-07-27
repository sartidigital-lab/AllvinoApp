"use client";

import { FormEvent, useEffect, useState } from 'react';
import { AdminNotice, AdminPageHeader, AdminSection } from '@/components/admin/AdminPrimitives';
import { createClient } from '@/utils/supabase/client';

export default function AdminProfilePage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const loadProfile = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      setName(String(user?.user_metadata?.nome_completo || ''));
      setEmail(user?.email || '');
    };

    loadProfile();
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedName = name.trim();

    if (normalizedName.length < 2) {
      setMessage('Informe um nome com pelo menos 2 caracteres.');
      return;
    }

    setIsSaving(true);
    setMessage(null);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({
      data: { nome_completo: normalizedName },
    });

    setMessage(error ? 'Não foi possível atualizar o perfil.' : 'Perfil atualizado com sucesso.');
    setIsSaving(false);
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader title="Meu Perfil" description="Atualize os dados exibidos no painel administrativo." />

      {message && <AdminNotice tone={message.includes('sucesso') ? 'success' : 'danger'}>{message}</AdminNotice>}

      <AdminSection title="Dados da conta" icon="manage_accounts">
        <form onSubmit={handleSubmit} className="grid max-w-2xl grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="space-y-1 sm:col-span-2">
            <span className="text-xs font-bold uppercase text-stone-400">Nome</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              autoComplete="name"
              className="h-11 w-full rounded-lg border border-stone-200 px-3 text-sm font-bold outline-none focus:border-black"
            />
          </label>
          <label className="space-y-1 sm:col-span-2">
            <span className="text-xs font-bold uppercase text-stone-400">E-mail</span>
            <input
              value={email}
              readOnly
              className="h-11 w-full rounded-lg border border-stone-200 bg-stone-50 px-3 text-sm font-bold text-stone-500"
            />
          </label>
          <button
            type="submit"
            disabled={isSaving}
            className="admin-button bg-[#B91C1C] px-5 text-sm text-white hover:bg-red-800 disabled:opacity-60 sm:w-fit"
          >
            {isSaving ? 'Salvando...' : 'Salvar perfil'}
          </button>
        </form>
      </AdminSection>
    </div>
  );
}
