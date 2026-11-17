"use client";

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Copy, Ticket, Wine } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { PageTransition } from '@/components/ui';
import { getCurrentUserFast } from '@/lib/auth/currentUser';
import { fetchCustomerCoupons } from '@/lib/database/customerCoupons';
import type { CustomerCoupon } from '@/types/database';

function formatMoney(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function getDiscountLabel(coupon: CustomerCoupon) {
  return coupon.discount_type === 'percent'
    ? `${coupon.discount_value}% OFF`
    : `${formatMoney(coupon.discount_value)} OFF`;
}

function getRequirements(coupon: CustomerCoupon) {
  const requirements: string[] = [];
  if (coupon.min_subtotal > 0) requirements.push(`Pedidos a partir de ${formatMoney(coupon.min_subtotal)}`);
  if (coupon.min_item_quantity) requirements.push(`Mínimo de ${coupon.min_item_quantity} garrafa(s)`);
  if (coupon.requires_first_purchase) requirements.push('Exclusivo para sua primeira compra');
  if (coupon.scope === 'selected_products') {
    requirements.push(`Válido em ${coupon.selected_product_count} produto(s) selecionado(s)`);
  } else {
    requirements.push('Válido em toda a loja');
  }
  if (coupon.max_discount) requirements.push(`Desconto máximo de ${formatMoney(coupon.max_discount)}`);
  return requirements;
}

function getCouponTitle(coupon: CustomerCoupon) {
  return coupon.requires_first_purchase ? 'Primeira Compra' : coupon.title;
}

function shouldShowCustomRule(customRule: string | null) {
  return Boolean(customRule) && customRule.trim().toLocaleLowerCase('pt-BR') !== 'válido para clientes sem compra allvino';
}

export default function CouponsPage() {
  const router = useRouter();
  const [coupons, setCoupons] = useState<CustomerCoupon[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const loadCoupons = async () => {
      try {
        const user = await getCurrentUserFast();
        if (!user) {
          router.replace('/?login=true&redirectTo=/cupons');
          return;
        }

        const result = await fetchCustomerCoupons();
        if (!active) return;
        if (result.error) setMessage(result.error.message);
        setCoupons(result.coupons);
      } catch {
        if (active) setMessage('Não foi possível carregar seus cupons agora.');
      } finally {
        if (active) setIsLoading(false);
      }
    };

    void loadCoupons();
    return () => { active = false; };
  }, [router]);

  const copyCoupon = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      window.setTimeout(() => setCopiedCode((current) => current === code ? null : current), 2_000);
    } catch {
      setMessage('Não foi possível copiar o código. Você pode selecioná-lo manualmente.');
    }
  };

  return (
    <PageTransition>
      <main className="mx-auto max-w-xl space-y-6 px-5 pb-32 pt-8">
        <header className="rounded-3xl bg-[#741128] p-6 text-white shadow-lg shadow-red-950/10">
          <h1 className="font-serif text-3xl font-bold">Meus cupons</h1>
          <p className="mt-2 text-sm leading-6 text-rose-100">Confira seus benefícios disponíveis e use-os no próximo pedido.</p>
        </header>

        {message && (
          <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">{message}</p>
        )}

        {isLoading ? (
          <div className="space-y-3" aria-label="Carregando cupons">
            {[1, 2].map((item) => <div key={item} className="h-52 animate-pulse rounded-3xl bg-stone-100" />)}
          </div>
        ) : coupons.length === 0 ? (
          <section className="rounded-3xl border border-dashed border-stone-300 bg-white px-6 py-12 text-center">
            <Ticket className="mx-auto h-9 w-9 text-stone-300" aria-hidden="true" />
            <h2 className="mt-4 text-lg font-bold text-black">Nenhum cupom disponível</h2>
            <p className="mt-2 text-sm leading-6 text-stone-500">Quando houver um benefício válido para sua conta, ele aparecerá aqui.</p>
            <Link href="/catalogo" className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl bg-black px-5 text-sm font-bold text-white transition hover:bg-stone-800">
              Explorar vinhos
            </Link>
          </section>
        ) : (
          <div className="space-y-4">
            {coupons.map((coupon) => (
              <article key={coupon.id} className="overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-sm">
                <div className="flex items-start justify-between gap-4 bg-[#FDF7F2] p-5">
                  <div className="min-w-0">
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#B91C1C]">Cupom disponível</p>
                    <h2 className="mt-1 text-xl font-bold text-black">{getCouponTitle(coupon)}</h2>
                    {coupon.description && <p className="mt-1 text-sm leading-6 text-stone-600">{coupon.description}</p>}
                  </div>
                  <span className="shrink-0 rounded-xl bg-[#741128] px-3 py-2 text-sm font-black text-white">{getDiscountLabel(coupon)}</span>
                </div>

                <div className="space-y-4 p-5">
                  <div className="flex items-center justify-between gap-3 rounded-2xl border border-dashed border-stone-300 bg-stone-50 px-4 py-3">
                    <code className="text-base font-black tracking-[0.12em] text-[#741128]">{coupon.code}</code>
                    <button
                      type="button"
                      onClick={() => copyCoupon(coupon.code)}
                      className="inline-flex min-h-10 items-center gap-2 rounded-lg px-2 text-sm font-bold text-stone-600 transition hover:bg-white hover:text-black"
                    >
                      <Copy className="h-4 w-4" aria-hidden="true" />
                      {copiedCode === coupon.code ? 'Copiado' : 'Copiar'}
                    </button>
                  </div>

                  <ul className="space-y-2 text-sm text-stone-600">
                    {getRequirements(coupon).map((requirement) => (
                      <li key={requirement} className="flex gap-2"><Wine className="mt-0.5 h-4 w-4 shrink-0 text-[#B91C1C]" aria-hidden="true" />{requirement}</li>
                    ))}
                    {shouldShowCustomRule(coupon.custom_rule) && <li className="rounded-xl bg-stone-50 px-3 py-2 text-xs leading-5 text-stone-500">{coupon.custom_rule}</li>}
                    <li className="text-xs font-medium text-stone-400">
                      {coupon.ends_at ? `Válido até ${new Date(coupon.ends_at).toLocaleDateString('pt-BR')}.` : 'Sem data de encerramento.'}
                    </li>
                  </ul>

                  <Link
                    href={`/checkout?cupom=${encodeURIComponent(coupon.code)}`}
                    className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-black px-4 text-sm font-bold text-white transition hover:bg-stone-800"
                  >
                    Usar no checkout
                    <Ticket className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>
    </PageTransition>
  );
}
