"use client";

import { useEffect, useState } from 'react';
import { fetchWinesFromSupabase, createWine, updateWine, deleteWine } from '@/lib/database/wines';
import { Wine } from '@/types/database';

export default function AdminCatalogPage() {
  const [wines, setWines] = useState<Wine[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadWines();
  }, []);

  const loadWines = async () => {
    setIsLoading(true);
    try {
      const data = await fetchWinesFromSupabase();
      setWines(data);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este vinho?')) {
      await deleteWine(id);
      loadWines();
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center border-b border-stone-200 pb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold font-serif text-black">Catálogo de Vinhos</h1>
          <p className="text-stone-500 mt-1 font-bold">Gerencie os produtos da loja e PDVs.</p>
        </div>
        <button type="button" className="bg-black text-white px-6 py-2.5 rounded-xl font-bold shadow-lg hover:bg-stone-800 transition flex items-center gap-2">
          <span className="material-symbols-outlined text-[20px]">add</span> Novo Vinho
        </button>
      </div>

      <div className="bg-white rounded-3xl border border-stone-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#FDFBF7] text-stone-500 text-xs uppercase tracking-wider border-b border-stone-100">
                <th className="p-4 font-bold">Produto</th>
                <th className="p-4 font-bold">Tipo / Categoria</th>
                <th className="p-4 font-bold">Preço (R$)</th>
                <th className="p-4 font-bold">Estoque</th>
                <th className="p-4 font-bold">Status</th>
                <th className="p-4 font-bold text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-stone-500 font-bold">Carregando catálogo...</td>
                </tr>
              ) : wines.map((wine) => (
                <tr key={wine.id} className="hover:bg-stone-50 transition-colors">
                  <td className="p-4 flex items-center gap-4">
                    <img src={wine.imageUrl || 'https://via.placeholder.com/50x150'} alt={wine.name} className="h-16 object-contain" />
                    <div>
                      <p className="font-bold text-black">{wine.name}</p>
                      <p className="text-xs text-stone-400 font-bold">{wine.grape} • {wine.region}</p>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className="bg-stone-100 text-stone-600 px-3 py-1 rounded-full text-xs font-bold uppercase">{wine.type}</span>
                  </td>
                  <td className="p-4 font-bold text-black">R$ {wine.price.toFixed(2)}</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded text-xs font-bold ${wine.stock > 10 ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-50'}`}>
                      {wine.stock} un.
                    </span>
                  </td>
                  <td className="p-4">
                    <span className="text-green-600 font-bold flex items-center gap-1 text-sm"><span className="material-symbols-outlined text-[16px]">check_circle</span> Ativo</span>
                  </td>
                  <td className="p-4 text-center">
                    <button className="text-blue-500 hover:text-blue-700 mr-3" title="Editar"><span className="material-symbols-outlined">edit</span></button>
                    <button onClick={() => handleDelete(wine.id)} className="text-red-500 hover:text-red-700" title="Excluir"><span className="material-symbols-outlined">delete</span></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
