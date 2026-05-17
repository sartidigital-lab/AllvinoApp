"use client";

import { useCart } from '@/context/CartContext';
import { createOrder } from '@/lib/database/orders';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function CheckoutPage() {
  const { cart, cartTotal, clearCart } = useCart();
  const router = useRouter();
  
  const [user, setUser] = useState<{ id: string; name: string; phone: string } | null>(null);
  const [entrega, setEntrega] = useState('entrega');
  const [endereco, setEndereco] = useState('');
  const [pagamento, setPagamento] = useState('Pix');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        router.replace('/auth/login?redirectTo=/checkout');
        return;
      }
      
      const userData = session.user.user_metadata || {};
      setUser({
        id: session.user.id,
        name: userData.nome_completo || session.user.email?.split('@')[0] || '',
        phone: userData.telefone || 'Não informado',
      });
    };
    fetchUser();
  }, [router]);

  const discount = entrega === 'retirada' ? cartTotal * 0.1 : 0;
  const finalTotal = cartTotal - discount;

  const handleFinalizar = async () => {
    if (cart.length === 0) {
      alert("Carrinho vazio!");
      return;
    }
    if (entrega === 'entrega' && !endereco.trim()) {
      alert("Informe o seu endereço para entrega.");
      return;
    }
    if (!user) return;

    setIsLoading(true);
    
    // Create order in DB
    const { order, error } = await createOrder(
      user.id, 
      cart, 
      finalTotal, 
      entrega === 'retirada' ? 'Retirada na Loja' : `Entrega: ${endereco}`
    );

    if (error || !order) {
      alert("Erro ao criar pedido. Tente novamente.");
      setIsLoading(false);
      return;
    }

    // Build WhatsApp message
    const itensMsg = cart.map(x => `🍷 *${x.quantity}x ${x.name}*`).join('\n');
    let msg = `*NOVO PEDIDO - ALLVINO*\n\n👤 *Cliente:* ${user.name}\n📞 *WhatsApp:* ${user.phone}\n\n📦 *ITENS DO PEDIDO:* \n${itensMsg}\n\n💳 *Pagamento:* ${pagamento}\n🚚 *Modalidade:* ${entrega === 'retirada' ? 'Retirada na Loja (-10% OFF)' : 'Entrega no Endereço'}\n`;
    if(entrega === 'entrega') msg += `📍 *Endereço:* ${endereco}\n`;
    msg += `\n💰 *VALOR TOTAL: R$ ${finalTotal.toFixed(2).replace('.', ',')}*`;

    const foneVendas = "5527997933537"; 
    const link = `https://wa.me/${foneVendas}?text=${encodeURIComponent(msg)}`;

    clearCart();
    
    // Open whatsapp and redirect to account
    window.open(link, '_blank');
    router.replace('/conta');
  };

  if (!user) {
    return <p className="text-center mt-20 animate-pulse font-bold">Carregando Checkout...</p>;
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
            <p className="text-stone-500 text-sm">O seu carrinho está vazio.</p>
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
            <input type="text" readOnly value={user.phone} className="w-full border-stone-200 bg-stone-50 rounded-xl text-sm font-bold text-stone-500 mt-1 focus:ring-0" />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="bg-white rounded-3xl p-6 border border-stone-100 shadow-sm space-y-5">
          <h2 className="text-xs font-bold text-stone-400 uppercase tracking-widest border-b pb-2">Entrega</h2>
          <div className="space-y-3">
            <label className="flex items-center gap-3 p-4 border rounded-2xl border-stone-200 cursor-pointer has-[:checked]:border-black has-[:checked]:bg-stone-50 transition">
              <input type="radio" name="entrega" value="entrega" checked={entrega === 'entrega'} onChange={() => setEntrega('entrega')} className="text-black focus:ring-0" />
              <div className="flex-1 text-sm font-bold">Entrega no Endereço</div>
            </label>
            <label className="flex items-center gap-3 p-4 border rounded-2xl border-stone-200 cursor-pointer has-[:checked]:border-black has-[:checked]:bg-stone-50 transition">
              <input type="radio" name="entrega" value="retirada" checked={entrega === 'retirada'} onChange={() => setEntrega('retirada')} className="text-black focus:ring-0" />
              <div className="flex-1 text-sm font-bold">Retirada na Loja <span className="text-green-600 text-[10px] ml-2">10% OFF</span></div>
            </label>
          </div>
          {entrega === 'entrega' && (
            <div className="space-y-3">
              <textarea 
                value={endereco}
                onChange={(e) => setEndereco(e.target.value)}
                placeholder="Rua, número, bairro e cidade para entrega..." 
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
            onChange={(e) => setPagamento(e.target.value)}
            className="w-full border-stone-200 rounded-2xl p-4 text-sm outline-none focus:border-black transition-colors font-bold"
          >
            <option value="Pix">Pix (Rápido e Seguro)</option>
            <option value="Cartão (Link)">Cartão de Crédito (Link de Pagamento)</option>
            <option value="Cartão (Maquininha)">Cartão (Levar maquininha)</option>
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
