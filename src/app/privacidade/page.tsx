const cookieCategories = [
  ['Necessários', 'Usados para segurança, sessão, carrinho e recursos essenciais da loja.'],
  ['Medição', 'Google Analytics. Ajudam a entender o uso do site para evoluir a experiência.'],
  ['Marketing', 'Meta (Facebook e Instagram) e Google Ads. Medem a eficácia dos anúncios e permitem campanhas. Quando você compra, enviamos a esses serviços o valor e os produtos do pedido e seus dados de contato (e-mail, telefone e nome) em formato criptografado.'],
];

export default function PrivacidadePage() {
  return (
    <main className="mx-auto min-h-screen max-w-3xl px-5 pb-32 pt-10 sm:pt-14">
      <p className="text-[10px] font-extrabold uppercase tracking-[0.28em] text-brand-primary">Privacidade</p>
      <h1 className="mt-2 font-serif text-3xl font-bold text-brand-ink sm:text-4xl">Cookies e rastreamento</h1>
      <p className="mt-5 max-w-2xl text-sm leading-7 text-brand-ink-light">A Allvino utiliza cookies necessários para manter a experiência de compra segura e funcional. Também usamos cookies e tecnologias semelhantes de medição e de marketing para entender como o site é usado e para medir e melhorar nossos anúncios. Essas categorias ficam ativas para todos os visitantes.</p>

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
        <h2 className="text-lg font-bold text-brand-ink">Como se opor ou pedir seus dados</h2>
        <p className="mt-2 text-sm leading-6 text-brand-ink-light">Você pode bloquear ou apagar cookies nas configurações do seu navegador. Para tirar dúvidas, pedir acesso ou a exclusão dos seus dados, fale com o nosso atendimento pelo{' '}
          <a
            href={`https://wa.me/5527992770952?text=${encodeURIComponent('Olá, gostaria de falar sobre meus dados na Allvino.')}`}
            target="_blank"
            rel="noreferrer"
            className="font-bold text-brand-primary hover:underline"
          >
            WhatsApp
          </a>
          .
        </p>
      </section>
    </main>
  );
}
