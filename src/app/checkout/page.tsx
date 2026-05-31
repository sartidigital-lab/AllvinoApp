"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useCart } from '@/context/CartContext';
import { CurrentUser, getCurrentUserFast } from '@/lib/auth/currentUser';
import { createOrder } from '@/lib/database/orders';
import {
  calculatePromotionDiscount,
  fetchActivePromotionByCode,
  normalizePromotionCode,
} from '@/lib/database/promotions';
import { fetchDeliveryQuote } from '@/lib/database/delivery';
import { calculateShippingFee, formatZipCode, normalizeZipCode } from '@/lib/delivery/rules';
import { DeliveryZone, Promotion } from '@/types/database';

export default function CheckoutPage() {
  const { cart, cartTotal, clearCart } = useCart();
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [entrega, setEntrega] = useState('entrega');
  const [endereco, setEndereco] = useState('');
  const [cep, setCep] = useState('');
  const [deliveryZone, setDeliveryZone] = useState<DeliveryZone | null>(null);
  const [deliveryMessage, setDeliveryMessage] = useState<string | null>(null);
  const [unsupportedZip, setUnsupportedZip] = useState<string | null>(null);
  const [isCheckingDelivery, setIsCheckingDelivery] = useState(false);
  const [pagamento, setPagamento] = useState('Pix');
  const [promotionCode, setPromotionCode] = useState('');
  const [appliedPromotion, setAppliedPromotion] = useState<Promotion | null>(null);
  const [promotionMessage, setPromotionMessage] = useState<string | null>(null);
  const [isCheckingPromotion, setIsCheckingPromotion] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [successOrderId, setSuccessOrderId] = useState<string | null>(null);
  const [successSummary, setSuccessSummary] = useState<{
    total: number;
    subtotal: number;
    discount: number;
    promotionCode: string | null;
    shippingFee: number;
    zipCode: string | null;
    zoneName: string | null;
    estimateDays: number | null;
    payment: string;
    delivery: string;
    address: string | null;
  } | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      const currentUser = await getCurrentUserFast();

      if (!currentUser) {
        window.location.assign('/?login=true&redirectTo=/checkout');
        return;
      }

      setUser(currentUser);
    };

    fetchUser();
  }, []);

  const pickupDiscount = entrega === 'retirada' ? cartTotal * 0.1 : 0;
  const promotionDiscount = appliedPromotion ? calculatePromotionDiscount(appliedPromotion, cartTotal) : 0;
  const discount = Math.min(cartTotal, pickupDiscount + promotionDiscount);
  const shippingFee = entrega === 'entrega' && deliveryZone ? calculateShippingFee(deliveryZone, cartTotal) : 0;
  const finalTotal = cartTotal - discount + shippingFee;
  const salesPhone = '552723453060';
  const cartItemsMessage = cart.map((item) => `${item.quantity}x ${item.name}`).join('\n');
  const unsupportedZipWhatsAppUrl = unsupportedZip
    ? `https://wa.me/${salesPhone}?text=${encodeURIComponent(
        `Ola, Allvino! Quero consultar entrega para o CEP ${formatZipCode(unsupportedZip)}.\n\nItens no carrinho:\n${cartItemsMessage || 'Carrinho ainda sem itens'}\n\nSubtotal: R$ ${cartTotal.toFixed(2).replace('.', ',')}`
      )}`
    : null;

  const handleApplyPromotion = async () => {
    const normalizedCode = normalizePromotionCode(promotionCode);

    if (!normalizedCode) {
      setPromotionMessage('Informe um cupom.');
      return;
    }

    setIsCheckingPromotion(true);
    setPromotionMessage(null);

    const { promotion, error } = await fetchActivePromotionByCode(normalizedCode);

    if (error) {
      setPromotionMessage('Nao foi possivel validar o cupom agora.');
      setAppliedPromotion(null);
      setIsCheckingPromotion(false);
      return;
    }

    if (!promotion) {
      setPromotionMessage('Cupom invalido ou expirado.');
      setAppliedPromotion(null);
      setIsCheckingPromotion(false);
      return;
    }

    const nextDiscount = calculatePromotionDiscount(promotion, cartTotal);
    if (nextDiscount <= 0) {
      setPromotionMessage(`Cupom valido para pedidos a partir de R$ ${promotion.min_subtotal.toFixed(2).replace('.', ',')}.`);
      setAppliedPromotion(null);
      setIsCheckingPromotion(false);
      return;
    }

    setPromotionCode(promotion.code);
    setAppliedPromotion(promotion);
    setPromotionMessage(`${promotion.title} aplicado.`);
    setIsCheckingPromotion(false);
  };

  const clearPromotion = () => {
    setAppliedPromotion(null);
    setPromotionCode('');
    setPromotionMessage(null);
  };

  const handleCalculateDelivery = async () => {
    const normalizedZip = normalizeZipCode(cep);

    if (normalizedZip.length !== 8) {
      setDeliveryMessage('Informe um CEP com 8 digitos.');
      setDeliveryZone(null);
      setUnsupportedZip(null);
      return;
    }

    setIsCheckingDelivery(true);
    setDeliveryMessage(null);

    const { zone, shippingFee: nextShippingFee, error } = await fetchDeliveryQuote(normalizedZip, cartTotal);

    if (error) {
      setDeliveryMessage('Nao foi possivel calcular o frete agora.');
      setDeliveryZone(null);
      setUnsupportedZip(null);
      setIsCheckingDelivery(false);
      return;
    }

    if (!zone) {
      setDeliveryMessage('Ainda nao entregamos neste CEP.');
      setDeliveryZone(null);
      setUnsupportedZip(normalizedZip);
      setIsCheckingDelivery(false);
      return;
    }

    setCep(formatZipCode(normalizedZip));
    setDeliveryZone(zone);
    setUnsupportedZip(null);
    setDeliveryMessage(
      `${zone.name}: ${nextShippingFee === 0 ? 'frete gratis' : `frete R$ ${nextShippingFee.toFixed(2).replace('.', ',')}`} em ate ${zone.estimate_days} dia(s).`
    );
    setIsCheckingDelivery(false);
  };

  const handleFinalizar = async () => {
    if (cart.length === 0) {
      alert('Carrinho vazio!');
      return;
    }

    if (entrega === 'entrega' && !endereco.trim()) {
      alert('Informe o seu endereco para entrega.');
      return;
    }

    if (entrega === 'entrega' && !deliveryZone) {
      alert('Calcule o frete para o CEP de entrega.');
      return;
    }

    if (!user) return;

    setIsLoading(true);

    const { order, error } = await createOrder(
      user.id,
      cart,
      finalTotal,
      entrega === 'retirada' ? 'Retirada na Loja' : 'Entrega no Endereco',
      pagamento,
      entrega === 'entrega' ? endereco : undefined,
      appliedPromotion?.code,
      entrega === 'entrega' ? normalizeZipCode(cep) : undefined
    );

    if (error || !order) {
      alert('Erro ao criar pedido. Tente novamente.');
      setIsLoading(false);
      return;
    }

    const itensMsg = cart.map((item) => `*${item.quantity}x ${item.name}*`).join('\n');
    let msg = `*NOVO PEDIDO - ALLVINO*\n\n*Cliente:* ${user.name}\n*WhatsApp:* ${user.phone || 'Nao informado'}\n\n*ITENS DO PEDIDO:*\n${itensMsg}\n\n*Pagamento:* ${pagamento}\n*Modalidade:* ${entrega === 'retirada' ? 'Retirada na Loja (-10% OFF)' : 'Entrega no Endereco'}\n`;

    if (order.promotion_code) {
      msg += `*Cupom:* ${order.promotion_code}\n`;
    }

    if (entrega === 'entrega') {
      msg += `*Endereco:* ${endereco}\n`;
      if (order.delivery_zip_code) msg += `*CEP:* ${formatZipCode(order.delivery_zip_code)}\n`;
      if (order.shipping_fee > 0) msg += `*Frete:* R$ ${order.shipping_fee.toFixed(2).replace('.', ',')}\n`;
    }

    msg += `\n*VALOR TOTAL: R$ ${order.total_amount.toFixed(2).replace('.', ',')}*`;

    const link = `https://wa.me/${salesPhone}?text=${encodeURIComponent(msg)}`;

    window.open(link, '_blank');
    clearCart();
    setSuccessOrderId(order.id);
    setSuccessSummary({
      total: order.total_amount,
      subtotal: order.subtotal_amount || cartTotal,
      discount: order.discount_amount || 0,
      promotionCode: order.promotion_code,
      shippingFee: order.shipping_fee || 0,
      zipCode: order.delivery_zip_code,
      zoneName: order.delivery_zone_name,
      estimateDays: order.delivery_estimate_days,
      payment: order.payment_method || pagamento,
      delivery: order.delivery_type,
      address: order.delivery_address,
    });
    setIsLoading(false);
  };

  if (!user) {
    return <p className="text-center mt-20 animate-pulse font-bold">Carregando Checkout...</p>;
  }

  if (successOrderId && successSummary) {
    return (
      <main className="max-w-xl mx-auto px-5 pt-10 pb-32">
        <div className="rounded-3xl border border-emerald-100 bg-white p-8 text-center shadow-sm space-y-5">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
            <span className="material-symbols-outlined text-4xl">check</span>
          </div>
          <div>
            <h1 className="text-3xl font-bold font-serif text-black">Pedido realizado</h1>
            <p className="mt-2 text-sm font-bold text-stone-500">
              Enviamos o pedido para o WhatsApp da Allvino. Agora e so acompanhar o status na sua conta.
            </p>
          </div>
          <p className="rounded-2xl bg-stone-50 px-4 py-3 text-xs font-bold uppercase tracking-widest text-stone-500">
            Pedido #{successOrderId.slice(0, 8)}
          </p>
          <div className="space-y-2 rounded-2xl bg-stone-50 p-4 text-left text-sm">
            <div className="flex justify-between gap-4">
              <span className="font-bold text-stone-500">Pagamento</span>
              <span className="font-bold text-black">{successSummary.payment}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="font-bold text-stone-500">Entrega</span>
              <span className="font-bold text-black">{successSummary.delivery}</span>
            </div>
            {successSummary.address && (
              <div className="flex justify-between gap-4">
                <span className="font-bold text-stone-500">Endereco</span>
                <span className="text-right font-bold text-black">{successSummary.address}</span>
              </div>
            )}
            {successSummary.zipCode && (
              <div className="flex justify-between gap-4">
                <span className="font-bold text-stone-500">CEP</span>
                <span className="font-bold text-black">{formatZipCode(successSummary.zipCode)}</span>
              </div>
            )}
            {successSummary.zoneName && (
              <div className="flex justify-between gap-4">
                <span className="font-bold text-stone-500">Prazo</span>
                <span className="text-right font-bold text-black">
                  {successSummary.zoneName}
                  {successSummary.estimateDays ? `, ate ${successSummary.estimateDays} dia(s)` : ''}
                </span>
              </div>
            )}
            {successSummary.shippingFee > 0 && (
              <div className="flex justify-between gap-4">
                <span className="font-bold text-stone-500">Frete</span>
                <span className="font-bold text-black">R$ {successSummary.shippingFee.toFixed(2).replace('.', ',')}</span>
              </div>
            )}
            {successSummary.discount > 0 && (
              <div className="flex justify-between gap-4 text-emerald-700">
                <span className="font-bold">
                  Desconto{successSummary.promotionCode ? ` (${successSummary.promotionCode})` : ''}
                </span>
                <span className="font-bold">- R$ {successSummary.discount.toFixed(2).replace('.', ',')}</span>
              </div>
            )}
            <div className="flex justify-between gap-4 border-t border-stone-200 pt-2 text-base">
              <span className="font-bold text-black">Total</span>
              <span className="font-bold text-black">R$ {successSummary.total.toFixed(2).replace('.', ',')}</span>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3">
            <Link href="/conta" className="rounded-2xl bg-[#B91C1C] py-4 text-sm font-bold text-white">
              Ver meus pedidos
            </Link>
            <Link href="/catalogo" className="rounded-2xl border border-stone-200 py-4 text-sm font-bold text-stone-600">
              Continuar comprando
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-xl mx-auto px-5 pt-8 pb-32 space-y-8 animate-in fade-in duration-300">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold font-serif text-black text-center">Finalizar Pedido</h1>
        <p className="text-stone-500 text-sm text-center">Confirme os seus dados para enviarmos o pedido.</p>
      </div>

      <div className="bg-white rounded-3xl p-6 border border-stone-100 shadow-sm space-y-4">
        <h2 className="text-xs font-bold text-stone-400 uppercase tracking-widest border-b pb-2">Seus Itens</h2>
        <div className="space-y-3">
          {cart.length === 0 ? (
            <p className="text-stone-500 text-sm">O seu carrinho esta vazio.</p>
          ) : (
            cart.map((item) => (
              <div key={item.id} className="flex justify-between items-center text-sm">
                <div className="flex gap-2 items-center">
                  <span className="font-bold text-stone-400">{item.quantity}x</span>
                  <span className="font-bold text-black">{item.name}</span>
                </div>
                <span className="font-bold">R$ {(item.price * item.quantity).toFixed(2).replace('.', ',')}</span>
              </div>
            ))
          )}
        </div>
        <div className="border-t pt-4 space-y-2">
          <div className="flex justify-between text-sm text-stone-500">
            <span>Subtotal</span>
            <span>R$ {cartTotal.toFixed(2).replace('.', ',')}</span>
          </div>
          {discount > 0 && (
            <div className="flex justify-between text-sm text-green-600">
              <span>Descontos</span>
              <span>- R$ {discount.toFixed(2).replace('.', ',')}</span>
            </div>
          )}
          {shippingFee > 0 && (
            <div className="flex justify-between text-sm text-stone-500">
              <span>Frete</span>
              <span>R$ {shippingFee.toFixed(2).replace('.', ',')}</span>
            </div>
          )}
          <div className="flex justify-between text-xl font-bold pt-2">
            <span>Total</span>
            <span>R$ {finalTotal.toFixed(2).replace('.', ',')}</span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl p-6 border border-stone-100 shadow-sm space-y-5">
        <h2 className="text-xs font-bold text-stone-400 uppercase tracking-widest border-b pb-2">Seus Dados</h2>
        <div className="grid grid-cols-1 gap-4">
          <div>
            <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest ml-1">Nome</label>
            <input type="text" readOnly value={user.name} className="w-full border-stone-200 bg-stone-50 rounded-xl text-sm font-bold text-stone-500 mt-1 focus:ring-0" />
          </div>
          <div>
            <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest ml-1">WhatsApp</label>
            <input type="text" readOnly value={user.phone || 'Nao informado'} className="w-full border-stone-200 bg-stone-50 rounded-xl text-sm font-bold text-stone-500 mt-1 focus:ring-0" />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="bg-white rounded-3xl p-6 border border-stone-100 shadow-sm space-y-4">
          <h2 className="text-xs font-bold text-stone-400 uppercase tracking-widest border-b pb-2">Cupom</h2>
          <div className="flex gap-2">
            <input
              value={promotionCode}
              onChange={(event) => {
                setPromotionCode(event.target.value.toUpperCase());
                if (appliedPromotion) setAppliedPromotion(null);
              }}
              placeholder="Digite seu cupom"
              className="min-w-0 flex-1 border-stone-200 rounded-2xl p-4 text-sm font-bold uppercase outline-none focus:border-black transition-colors"
            />
            {appliedPromotion ? (
              <button
                type="button"
                onClick={clearPromotion}
                className="rounded-2xl border border-stone-200 px-4 text-sm font-bold text-stone-600"
              >
                Remover
              </button>
            ) : (
              <button
                type="button"
                onClick={handleApplyPromotion}
                disabled={isCheckingPromotion || cart.length === 0}
                className="rounded-2xl bg-black px-4 text-sm font-bold text-white disabled:opacity-50"
              >
                {isCheckingPromotion ? 'Validando...' : 'Aplicar'}
              </button>
            )}
          </div>
          {promotionMessage && (
            <p className={`text-xs font-bold ${appliedPromotion ? 'text-emerald-700' : 'text-stone-500'}`}>
              {promotionMessage}
            </p>
          )}
          {appliedPromotion && (
            <div className="rounded-2xl bg-emerald-50 p-3 text-xs font-bold text-emerald-800">
              Desconto do cupom: - R$ {promotionDiscount.toFixed(2).replace('.', ',')}
            </div>
          )}
        </div>

        <div className="bg-white rounded-3xl p-6 border border-stone-100 shadow-sm space-y-5">
          <h2 className="text-xs font-bold text-stone-400 uppercase tracking-widest border-b pb-2">Entrega</h2>
          <div className="space-y-3">
            <label className="flex items-center gap-3 p-4 border rounded-2xl border-stone-200 cursor-pointer has-[:checked]:border-black has-[:checked]:bg-stone-50 transition">
              <input type="radio" name="entrega" value="entrega" checked={entrega === 'entrega'} onChange={() => setEntrega('entrega')} className="text-black focus:ring-0" />
              <div className="flex-1 text-sm font-bold">Entrega no Endereco</div>
            </label>
            <label className="flex items-center gap-3 p-4 border rounded-2xl border-stone-200 cursor-pointer has-[:checked]:border-black has-[:checked]:bg-stone-50 transition">
              <input type="radio" name="entrega" value="retirada" checked={entrega === 'retirada'} onChange={() => setEntrega('retirada')} className="text-black focus:ring-0" />
              <div className="flex-1 text-sm font-bold">Retirada na Loja <span className="text-green-600 text-[10px] ml-2">10% OFF</span></div>
            </label>
          </div>
          {entrega === 'entrega' && (
            <div className="space-y-3">
              <div className="flex gap-2">
                <input
                  value={cep}
                  onChange={(event) => {
                    setCep(formatZipCode(event.target.value));
                    setDeliveryZone(null);
                    setUnsupportedZip(null);
                  }}
                  placeholder="CEP"
                  className="min-w-0 flex-1 border-stone-200 rounded-2xl p-4 text-sm font-bold outline-none focus:border-black transition-colors"
                />
                <button
                  type="button"
                  onClick={handleCalculateDelivery}
                  disabled={isCheckingDelivery || cart.length === 0}
                  className="rounded-2xl bg-black px-4 text-sm font-bold text-white disabled:opacity-50"
                >
                  {isCheckingDelivery ? 'Calculando...' : 'Calcular'}
                </button>
              </div>
              {deliveryMessage && (
                <p className={`text-xs font-bold ${deliveryZone ? 'text-emerald-700' : 'text-stone-500'}`}>
                  {deliveryMessage}
                </p>
              )}
              {unsupportedZipWhatsAppUrl && (
                <a
                  href={unsupportedZipWhatsAppUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-center gap-2 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700"
                >
                  <span className="material-symbols-outlined text-[18px]">chat</span>
                  Consultar atendimento pelo WhatsApp
                </a>
              )}
              <textarea
                value={endereco}
                onChange={(event) => setEndereco(event.target.value)}
                placeholder="Rua, numero, bairro e cidade para entrega..."
                className="w-full border-stone-200 rounded-2xl p-4 text-sm outline-none focus:border-black transition-colors"
                rows={3}
              />
            </div>
          )}
        </div>

        <div className="bg-white rounded-3xl p-6 border border-stone-100 shadow-sm space-y-5">
          <h2 className="text-xs font-bold text-stone-400 uppercase tracking-widest border-b pb-2">Pagamento</h2>
          <select
            value={pagamento}
            onChange={(event) => setPagamento(event.target.value)}
            className="w-full border-stone-200 rounded-2xl p-4 text-sm outline-none focus:border-black transition-colors font-bold"
          >
            <option value="Pix">Pix (Rapido e Seguro)</option>
            <option value="Cartao (Link)">Cartao de Credito (Link de Pagamento)</option>
            <option value="Cartao (Maquininha)">Cartao (Levar maquininha)</option>
          </select>
        </div>
      </div>

      <div className="space-y-3">
        <p className="text-center text-sm font-bold text-stone-500">O pedido sera recebido em nosso WhatsApp.</p>
        <button
          onClick={handleFinalizar}
          disabled={isLoading}
          className="w-full bg-[#25D366] text-white py-5 rounded-3xl font-bold text-lg shadow-xl shadow-emerald-900/20 active:scale-95 transition-transform flex items-center justify-center gap-3 hover:bg-[#1ebe5d] disabled:opacity-50"
        >
          <svg aria-hidden="true" viewBox="0 0 32 32" className="h-6 w-6 fill-current">
            <path d="M16.03 4C9.39 4 4 9.28 4 15.78c0 2.24.65 4.34 1.78 6.12L4.61 28l6.29-1.62A12.2 12.2 0 0 0 16.03 27C22.67 27 28 21.72 28 15.22 28 8.72 22.67 4 16.03 4Zm0 20.83c-1.66 0-3.28-.43-4.7-1.25l-.34-.2-3.73.96.99-3.55-.23-.37a9.36 9.36 0 0 1-1.49-5.07c0-5.3 4.38-9.62 9.76-9.62 5.37 0 9.19 4.02 9.19 9.49 0 5.3-4.09 9.61-9.45 9.61Zm5.37-7.2c-.29-.14-1.72-.83-1.99-.92-.27-.1-.46-.14-.66.14-.19.28-.76.92-.93 1.11-.17.19-.34.21-.63.07-.29-.14-1.23-.44-2.34-1.4-.86-.75-1.44-1.68-1.61-1.96-.17-.28-.02-.43.13-.57.13-.13.29-.34.43-.51.14-.16.19-.28.29-.47.1-.19.05-.35-.02-.5-.07-.14-.66-1.55-.9-2.13-.24-.56-.49-.49-.66-.5h-.56c-.19 0-.5.07-.76.35-.27.28-1 1-1 2.42 0 1.42 1.03 2.79 1.17 2.98.14.19 2.03 3.02 4.91 4.24.69.29 1.22.46 1.64.59.69.21 1.31.18 1.8.11.55-.08 1.72-.69 1.96-1.35.24-.67.24-1.24.17-1.35-.07-.11-.26-.18-.55-.32Z" />
          </svg>
          {isLoading ? 'ENVIANDO...' : 'ENVIAR PEDIDO'}
        </button>
      </div>
    </main>
  );
}
