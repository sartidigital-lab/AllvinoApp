"use client";

export default function AdminTeamPage() {
  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center border-b border-stone-200 pb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold font-serif text-black">Equipe & Acessos</h1>
          <p className="text-stone-500 mt-1 font-bold">Gerencie promotores, vendedores e permissões do sistema.</p>
        </div>
        <button type="button" className="bg-orange-500 text-white px-6 py-2.5 rounded-xl font-bold shadow-lg hover:bg-orange-600 transition flex items-center gap-2">
          <span className="material-symbols-outlined text-[20px]">person_add</span> Novo Usuário
        </button>
      </div>

      <div className="bg-white rounded-3xl border border-stone-100 shadow-sm p-8 text-center">
        <span className="material-symbols-outlined text-6xl text-stone-200 mb-4">construction</span>
        <h2 className="text-xl font-bold text-stone-600">Em Desenvolvimento</h2>
        <p className="text-stone-400 mt-2">A gestão de equipe e RBAC será ativada na próxima atualização.</p>
      </div>
    </div>
  );
}
