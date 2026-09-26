const cookieCategories = [
  ['Necessários', 'Usados para segurança, sessão, carrinho e recursos essenciais da loja.'],
  ['Preferências', 'Guardam escolhas de experiência quando autorizados.'],
  ['Medição', 'Ajudam a entender o uso do site para evoluir a experiência.'],
  ['Marketing', 'Permitem ações e campanhas personalizadas quando autorizadas.'],
];

export default function PrivacidadePage() {
  return (
    <main className="mx-auto min-h-screen max-w-3xl px-5 pb-32 pt-10 sm:pt-14">
      <p className="text-[10px] font-extrabold uppercase tracking-[0.28em] text-brand-primary">Privacidade</p>
      <h1 className="mt-2 font-serif text-3xl font-bold text-brand-ink sm:text-4xl">Cookies e suas preferências</h1>
      <p className="mt-5 max-w-2xl text-sm leading-7 text-brand-ink-light">A Allvino utiliza cookies necessários para manter a experiência de compra segura e funcional. As demais categorias dependem da sua escolha e podem ser revisadas a qualquer momento pelo botão de preferências de cookies.</p>

      <section className="mt-8 space-y-3" aria-labelledby="cookie-categories-title">
        <h2 id="cookie-categories-title" className="text-lg font-bold text-brand-ink">Categorias de cookies</h2>
        {cookieCategories.map(([title, description]) => (
          <article key={title} className="rounded-brand-xl border border-brand-border bg-white p-5 shadow-brand-sm">
            <h3 className="text-sm font-bold text-brand-ink">{title}</h3>
            <p className="mt-1 text-sm leading-6 text-brand-ink-light">{description}</p>
          </article>
        ))}
      </section>

      <section className="mt-8 rounded-brand-xl border border-brand-border bg-brand-surface-elevated p-5">
        <h2 className="text-lg font-bold text-brand-ink">Controle da sua escolha</h2>
        <p className="mt-2 text-sm leading-6 text-brand-ink-light">Sua escolha é guardada por até um ano neste navegador. Você pode alterá-la pelo botão “Preferências de cookies”, disponível em todas as páginas.</p>
      </section>
    </main>
  );
}
