'use client';

import { type FormEvent, useEffect, useState } from 'react';
import { formatCpf, formatPhone, isValidCpf, isValidPhone } from '@/lib/auth/customerRegistration';
import { getPasswordPolicyError } from '@/lib/auth/passwordPolicy';

type CustomerRegistrationDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  onRegistered: () => void;
};

const initialForm = {
  name: '',
  cpf: '',
  email: '',
  phone: '',
  password: '',
  whatsappOffers: true,
};

export function CustomerRegistrationDialog({ isOpen, onClose, onRegistered }: CustomerRegistrationDialogProps) {
  const [form, setForm] = useState(initialForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setForm(initialForm);
      setError(null);
      setIsSubmitting(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const update = <Key extends keyof typeof initialForm>(key: Key, value: (typeof initialForm)[Key]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (form.name.trim().length < 2) return setError('Informe o nome completo do cliente.');
    if (!isValidCpf(form.cpf)) return setError('Informe um CPF válido.');
    if (!isValidPhone(form.phone)) return setError('Informe um telefone ou WhatsApp válido com DDD.');
    const passwordError = getPasswordPolicyError(form.password);
    if (passwordError) return setError(passwordError);

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/admin/clientes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const body = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) {
        setError(body?.error || 'Não foi possível cadastrar o cliente.');
        return;
      }

      onRegistered();
      onClose();
    } catch {
      setError('Não foi possível conectar ao servidor. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end bg-black/45 p-0 backdrop-blur-sm sm:items-center sm:justify-center sm:p-6" role="presentation">
      <div role="dialog" aria-modal="true" aria-labelledby="customer-registration-title" className="max-h-[92dvh] w-full max-w-2xl overflow-y-auto rounded-t-3xl bg-[#FFFEFC] shadow-2xl sm:rounded-3xl">
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-stone-100 bg-[#FFFEFC]/95 px-5 py-5 backdrop-blur sm:px-7">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#8F1D2C]">Atendimento presencial</p>
            <h2 id="customer-registration-title" className="mt-1 font-serif text-2xl font-bold text-stone-950">Cadastrar cliente</h2>
            <p className="mt-1 text-sm font-medium text-stone-500">Crie o acesso do cliente para compras e atendimento na loja.</p>
          </div>
          <button type="button" onClick={onClose} disabled={isSubmitting} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-stone-500 transition hover:bg-stone-100 hover:text-stone-950 disabled:opacity-50" aria-label="Fechar cadastro">
            <span className="material-symbols-outlined" aria-hidden="true">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 px-5 py-6 sm:px-7 sm:py-7">
          {error && <p role="alert" className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">{error}</p>}

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-1.5 sm:col-span-2">
              <span className="ml-1 text-[10px] font-bold uppercase tracking-widest text-stone-500">Nome completo</span>
              <input required autoComplete="name" value={form.name} onChange={(event) => update('name', event.target.value)} placeholder="Nome do cliente" className="h-12 w-full rounded-xl border border-stone-200 bg-white px-4 text-sm font-semibold text-stone-900 outline-none transition focus:border-[#8F1D2C]" />
            </label>
            <label className="space-y-1.5">
              <span className="ml-1 text-[10px] font-bold uppercase tracking-widest text-stone-500">CPF</span>
              <input required inputMode="numeric" autoComplete="off" value={form.cpf} onChange={(event) => update('cpf', formatCpf(event.target.value))} placeholder="000.000.000-00" className="h-12 w-full rounded-xl border border-stone-200 bg-white px-4 text-sm font-semibold text-stone-900 outline-none transition focus:border-[#8F1D2C]" />
            </label>
            <label className="space-y-1.5">
              <span className="ml-1 text-[10px] font-bold uppercase tracking-widest text-stone-500">Telefone / WhatsApp</span>
              <input required inputMode="tel" autoComplete="tel" value={form.phone} onChange={(event) => update('phone', formatPhone(event.target.value))} placeholder="(00) 00000-0000" className="h-12 w-full rounded-xl border border-stone-200 bg-white px-4 text-sm font-semibold text-stone-900 outline-none transition focus:border-[#8F1D2C]" />
            </label>
            <label className="space-y-1.5 sm:col-span-2">
              <span className="ml-1 text-[10px] font-bold uppercase tracking-widest text-stone-500">E-mail</span>
              <input required type="email" autoComplete="email" value={form.email} onChange={(event) => update('email', event.target.value)} placeholder="cliente@email.com" className="h-12 w-full rounded-xl border border-stone-200 bg-white px-4 text-sm font-semibold text-stone-900 outline-none transition focus:border-[#8F1D2C]" />
            </label>
            <label className="space-y-1.5 sm:col-span-2">
              <span className="ml-1 text-[10px] font-bold uppercase tracking-widest text-stone-500">Criar senha</span>
              <input required type="password" autoComplete="new-password" value={form.password} onChange={(event) => update('password', event.target.value)} placeholder="Mínimo de 8 caracteres" className="h-12 w-full rounded-xl border border-stone-200 bg-white px-4 text-sm font-semibold text-stone-900 outline-none transition focus:border-[#8F1D2C]" />
              <span className="block px-1 text-xs text-stone-500">Use pelo menos 8 caracteres, com maiúscula, minúscula, número e símbolo.</span>
            </label>
          </div>

          <fieldset className="rounded-2xl border border-stone-200 bg-stone-50/70 p-4">
            <legend className="px-1 text-sm font-bold text-stone-900">Receber ofertas no WhatsApp?</legend>
            <p className="mt-1 text-xs leading-5 text-stone-500">A escolha fica registrada no cadastro do cliente.</p>
            <div className="mt-3 grid grid-cols-2 gap-3">
              {[
                { label: 'Sim', value: true, description: 'Pode receber ofertas.' },
                { label: 'Não', value: false, description: 'Não enviaremos ofertas.' },
              ].map((option) => (
                <label key={option.label} className={`cursor-pointer rounded-xl border p-3 transition ${form.whatsappOffers === option.value ? 'border-[#8F1D2C] bg-white ring-1 ring-[#8F1D2C]' : 'border-stone-200 bg-white hover:border-stone-300'}`}>
                  <input type="radio" name="whatsappOffers" value={String(option.value)} checked={form.whatsappOffers === option.value} onChange={() => update('whatsappOffers', option.value)} className="sr-only" />
                  <span className="block text-sm font-bold text-stone-900">{option.label}</span>
                  <span className="mt-0.5 block text-xs text-stone-500">{option.description}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="flex flex-col-reverse gap-3 border-t border-stone-100 pt-5 sm:flex-row sm:justify-end">
            <button type="button" onClick={onClose} disabled={isSubmitting} className="min-h-11 rounded-xl px-5 text-sm font-bold text-stone-600 transition hover:bg-stone-100 disabled:opacity-50">Cancelar</button>
            <button type="submit" disabled={isSubmitting} className="admin-button flex min-h-11 items-center justify-center gap-2 bg-[#8F1D2C] px-5 text-sm text-white shadow-sm hover:bg-[#68131F] disabled:cursor-not-allowed disabled:opacity-60">
              <span className="material-symbols-outlined text-[18px]" aria-hidden="true">person_add</span>
              {isSubmitting ? 'Cadastrando...' : 'Cadastrar cliente'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


