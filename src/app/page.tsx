import Link from 'next/link';

export default function HomePage() {
  return (
    <>
      {/* HERO SECTION: Uma introdução elegante e impactante */}
      <main className="relative w-full h-[80vh] flex flex-col justify-center items-center text-center px-6 overflow-hidden">
        {/* Fundo Escuro com Opacidade */}
        <div className="absolute inset-0 bg-[#0a0a0a] z-0">
          <img 
            src="https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?q=80&w=1000&auto=format&fit=crop" 
            className="w-full h-full object-cover opacity-30" 
            alt="Adega Allvino" 
          />
        </div>
        
        <div className="relative z-10 flex flex-col items-center space-y-6 max-w-lg">
          <img src="/LOGO-ALLVINO-BRANCO.png" alt="Allvino" className="h-16 w-auto object-contain mb-4" />
          
          <h1 className="text-4xl md:text-5xl font-bold font-serif text-white leading-tight">
            A sua adega digital de vinhos premium.
          </h1>
          <p className="text-stone-300 text-sm md:text-base mb-4 font-bold">
            Explore a nossa seleção exclusiva e receba os melhores rótulos do mundo diretamente em sua casa.
          </p>
          
          <Link href="/catalogo" className="bg-[#B91C1C] text-white px-8 py-4 rounded-full font-bold shadow-lg shadow-red-900/40 hover:bg-red-800 transition active:scale-95 flex items-center gap-2">
            Acessar o Catálogo <span className="material-symbols-outlined text-sm">arrow_forward</span>
          </Link>
        </div>
      </main>

      {/* SEÇÃO DE DESTAQUES */}
      <section className="max-w-4xl mx-auto px-5 py-12">
        <h2 className="text-center text-xs font-bold text-stone-400 uppercase tracking-widest mb-8">Porquê escolher a Allvino?</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-stone-100 flex flex-col items-center">
            <span className="material-symbols-outlined text-4xl text-[#B91C1C] mb-4">diamond</span>
            <h3 className="font-bold text-lg mb-2">Seleção Exclusiva</h3>
            <p className="text-stone-500 text-sm font-bold">Rótulos premiados e vinhos de colheitas raras, selecionados pelos nossos especialistas.</p>
          </div>
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-stone-100 flex flex-col items-center">
            <span className="material-symbols-outlined text-4xl text-black mb-4">local_shipping</span>
            <h3 className="font-bold text-lg mb-2">Entrega Rápida</h3>
            <p className="text-stone-500 text-sm font-bold">Logística especializada para garantir que a sua garrafa chega na temperatura e estado perfeitos.</p>
          </div>
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-stone-100 flex flex-col items-center">
            <span className="material-symbols-outlined text-4xl text-green-600 mb-4">storefront</span>
            <h3 className="font-bold text-lg mb-2">Retirada na Loja</h3>
            <p className="text-stone-500 text-sm font-bold">Prefere buscar o seu vinho pessoalmente? Ganhe 10% de desconto imediato no momento da recolha.</p>
          </div>
        </div>
      </section>
    </>
  );
}
