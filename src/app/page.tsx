import Link from 'next/link';

export default function HomePage() {
  return (
    <>
      <main className="relative flex h-[80vh] w-full flex-col items-center justify-center overflow-hidden px-6 text-center">
        <div className="absolute inset-0 z-0 bg-[#0a0a0a]">
          <img
            src="https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?q=80&w=1000&auto=format&fit=crop"
            className="h-full w-full object-cover opacity-30"
            alt="Adega Allvino"
          />
        </div>

        <div className="relative z-10 flex max-w-lg flex-col items-center space-y-6">
          <img src="/LOGO-ALLVINO-BRANCO.png" alt="Allvino" className="mb-4 h-16 w-auto object-contain" />

          <h1 className="font-serif text-4xl font-bold leading-tight text-white md:text-5xl">
            A sua adega digital de vinhos premium.
          </h1>
          <p className="mb-4 text-sm font-bold text-stone-300 md:text-base">
            Explore a nossa seleção exclusiva e receba os melhores rótulos do mundo diretamente em sua casa.
          </p>

          <Link
            href="/catalogo"
            className="flex items-center gap-2 rounded-full bg-[#B91C1C] px-8 py-4 font-bold text-white shadow-lg shadow-red-900/40 transition hover:bg-red-800 active:scale-95"
          >
            Acessar o Catálogo <span className="material-symbols-outlined text-sm">arrow_forward</span>
          </Link>
        </div>
      </main>

      <section className="mx-auto max-w-4xl px-5 py-12">
        <h2 className="mb-8 text-center text-xs font-bold uppercase tracking-widest text-stone-400">
          Por que escolher a Allvino?
        </h2>
        <div className="grid grid-cols-1 gap-8 text-center md:grid-cols-3">
          <div className="flex flex-col items-center rounded-3xl border border-stone-100 bg-white p-6 shadow-sm">
            <span className="material-symbols-outlined mb-4 text-4xl text-[#B91C1C]">diamond</span>
            <h3 className="mb-2 text-lg font-bold">Seleção Exclusiva</h3>
            <p className="text-sm font-bold text-stone-500">
              Rótulos premiados e vinhos de colheitas raras, selecionados pelos nossos especialistas.
            </p>
          </div>
          <div className="flex flex-col items-center rounded-3xl border border-stone-100 bg-white p-6 shadow-sm">
            <span className="material-symbols-outlined mb-4 text-4xl text-black">local_shipping</span>
            <h3 className="mb-2 text-lg font-bold">Entrega Rápida</h3>
            <p className="text-sm font-bold text-stone-500">
              Logística especializada para garantir que a sua garrafa chega na temperatura e estado perfeitos.
            </p>
          </div>
          <div className="flex flex-col items-center rounded-3xl border border-stone-100 bg-white p-6 shadow-sm">
            <span className="material-symbols-outlined mb-4 text-4xl text-green-600">storefront</span>
            <h3 className="mb-2 text-lg font-bold">Retirada na Loja</h3>
            <p className="text-sm font-bold text-stone-500">
              Prefere buscar o seu vinho pessoalmente? Ganhe 10% de desconto imediato no momento da recolha.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
