import Link from 'next/link';
import Image from 'next/image';

export default function HomePage() {
  return (
    <>
      <main className="relative flex h-[80vh] w-full flex-col items-center justify-center overflow-hidden px-6 text-center">
        <div className="absolute inset-0 z-0 bg-stone-950">
          <Image
            src="/hero-vinho-praia.webp"
            fill
            priority
            sizes="100vw"
            className="object-cover opacity-75"
            alt="Pessoas brindando com vinho à beira da piscina"
          />
          <div
            className="absolute inset-0 bg-gradient-to-b from-black/25 via-black/45 to-black/80"
            aria-hidden="true"
          />
        </div>

        <div className="relative z-10 flex max-w-lg flex-col items-center space-y-6">
          <h1 className="font-serif text-4xl font-bold leading-tight text-white md:text-5xl">
            A sua adega digital de vinhos premium.
          </h1>
          <p className="mb-4 text-sm font-bold text-stone-300 md:text-base">
            Explore a nossa seleção exclusiva e receba os melhores rótulos do mundo diretamente em sua casa.
          </p>

          <Link
            href="/catalogo"
            className="flex items-center gap-2 rounded-full bg-brand-primary px-8 py-4 font-bold text-white shadow-lg shadow-red-900/40 transition hover:bg-brand-primary-hover active:scale-95"
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
          <div className="surface-card flex flex-col items-center p-6">
            <span className="material-symbols-outlined mb-4 text-4xl text-brand-primary">diamond</span>
            <h3 className="mb-2 text-lg font-bold">Seleção Exclusiva</h3>
            <p className="text-sm font-bold text-stone-500">
              Rótulos premiados e vinhos de colheitas raras, selecionados pelos nossos especialistas.
            </p>
          </div>
          <div className="surface-card flex flex-col items-center p-6">
            <span className="material-symbols-outlined mb-4 text-4xl text-black">local_shipping</span>
            <h3 className="mb-2 text-lg font-bold">Entrega Rápida</h3>
            <p className="text-sm font-bold text-stone-500">
              Logística especializada para garantir que a sua garrafa chega na temperatura e estado perfeitos.
            </p>
          </div>
          <div className="surface-card flex flex-col items-center p-6">
            <span className="material-symbols-outlined mb-4 text-4xl text-green-600">storefront</span>
            <h3 className="mb-2 text-lg font-bold">Retirada na Loja</h3>
            <p className="text-sm font-bold text-stone-500">
              Prefere buscar o seu vinho pessoalmente? Ganhe 5% de desconto imediato no momento da recolha.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
