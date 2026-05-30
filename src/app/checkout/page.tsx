"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useCart } from '@/context/CartContext';
import { CurrentUser, getCurrentUserFast } from '@/lib/auth/currentUser';
import { createOrder } from '@/lib/database/orders';

export default function CheckoutPage() {
  const { cart, cartTotal, clearCart } = useCart();
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [entrega, setEntrega] = useState('entrega');
  const [endereco, setEndereco] = useState('');
  const [pagamento, setPagamento] = useState('Pix');
  const [isLoading, setIsLoading] = useState(false);
  const [successOrderId, setSuccessOrderId] = useState<string | null>(null);

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

  const discount = entrega === 'retirada' ? cartTotal * 0.1 : 0;
  const finalTotal = cartTotal - discount;

  const handleFinalizar = async () => {
    if (cart.length === 0) {
      alert('Carrinho vazio!');
      return;
    }

    if (entrega === 'entrega' && !endereco.trim()) {
      alert('Informe o seu endereco para entrega.');
      return;
    }

    if (!user) return;

    setIsLoading(true);

    const { order, error } = await createOrder(
      user.id,
      cart,
      finalTotal,
      entrega === 'retirada' ? 'Retirada na Loja' : `Entrega: ${endereco}`
    );

    if (error || !order) {
      alert('Erro ao criar pedido. Tente novamente.');
      setIsLoading(false);
      return;
    }

    const itensMsg = cart.map((item) => `*${item.quantity}x ${item.name}*`).join('\n');
    let msg = `*NOVO PEDIDO - ALLVINO*\n\n*Cliente:* ${user.name}\n*WhatsApp:* ${user.phone || 'Nao informado'}\n\n*ITENS DO PEDIDO:*\n${itensMsg}\n\n*Pagamento:* ${pagamento}\n*Modalidade:* ${entrega === 'retirada' ? 'Retirada na Loja (-10% OFF)' : 'Entrega no Endereco'}\n`;

    if (entrega === 'entrega') {
      msg += `*Endereco:* ${endereco}\n`;
    }

    msg += `\n*VALOR TOTAL: R$ ${finalTotal.toFixed(2).replace('.', ',')}*`;

    const foneVendas = '5527997933537';
    const link = `https://wa.me/${foneVendas}?text=${encodeURIComponent(msg)}`;

    window.open(link, '_blank');
    clearCart();
    setSuccessOrderId(order.id);
    setIsLoading(false);
  };

  if (!user) {
    return <p className="text-center mt-20 animate-pulse font-bold">Carregando Checkout...</p>;
  }

  if (successOrderId) {
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
              <span>Desconto Retirada (10%)</span>
              <span>- R$ {discount.toFixed(2).replace('.', ',')}</span>
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
            <textarea
              value={endereco}
              onChange={(event) => setEndereco(event.target.value)}
              placeholder="Rua, numero, bairro e cidade para entrega..."
              className="w-full border-stone-200 rounded-2xl p-4 text-sm outline-none focus:border-black transition-colors"
              rows={3}
            />
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

      <button
        onClick={handleFinalizar}
        disabled={isLoading}
        className="w-full bg-[#B91C1C] text-white py-5 rounded-3xl font-bold text-lg shadow-xl shadow-red-900/20 active:scale-95 transition-transform flex items-center justify-center disabled:opacity-50"
      >
        {isLoading ? 'ENVIANDO...' : 'ENVIAR PEDIDO'}
      </button>
    </main>
  );
}
