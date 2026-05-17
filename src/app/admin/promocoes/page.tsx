"use client";

export default function AdminPromotionsPage() {
  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center border-b border-stone-200 pb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold font-serif text-black">Promoções & Campanhas</h1>
          <p className="text-stone-500 mt-1 font-bold">Gerencie banners e kits promocionais ativos.</p>
        </div>
        <button type="button" className="bg-green-600 text-white px-6 py-2.5 rounded-xl font-bold shadow-lg hover:bg-green-700 transition flex items-center gap-2">
          <span className="material-symbols-outlined text-[20px]">campaign</span> Nova Campanha
        </button>
      </div>

      <div className="bg-white rounded-3xl border border-stone-100 shadow-sm p-8 text-center">
        <span className="material-symbols-outlined text-6xl text-stone-200 mb-4">construction</span>
        <h2 className="text-xl font-bold text-stone-600">Em Desenvolvimento</h2>
        <p className="text-stone-400 mt-2">A gestão de promoções será ativada na próxima atualização.</p>
      </div>
    </div>
  );
}
