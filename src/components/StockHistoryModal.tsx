import React, { useState } from 'react';
import { X, History, ArrowUpRight, ArrowDownRight, RotateCcw, Search, Filter } from 'lucide-react';
import { StockMovement } from '../types';
import { formatNumber } from '../utils/calculations';

interface StockHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  movements: StockMovement[];
  onEstornarMovement?: (movement: StockMovement) => void;
}

export const StockHistoryModal: React.FC<StockHistoryModalProps> = ({
  isOpen,
  onClose,
  movements,
  onEstornarMovement,
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  if (!isOpen) return null;

  const filtered = movements
    .filter((m) => {
      const matchSearch =
        m.ingredientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (m.note && m.note.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchType =
        typeFilter === 'all' ||
        (typeFilter === 'entrada' && m.type === 'entrada') ||
        (typeFilter === 'estorno' && m.type === 'estorno') ||
        (typeFilter === 'ajuste' && (m.type === 'ajuste' || m.type === 'saida'));
      return matchSearch && matchType;
    })
    .sort((a, b) => b.date - a.date);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 rounded-2xl max-w-2xl w-full p-4 sm:p-6 shadow-2xl border border-stone-200 dark:border-stone-800 my-6 animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-stone-100 dark:border-stone-800 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 flex items-center justify-center font-bold">
              <History className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-stone-900 dark:text-stone-100 font-display">
                Histórico de Movimentações do Estoque
              </h3>
              <p className="text-[11px] text-stone-500 dark:text-stone-400">
                Registro de entradas por compra, estornos e ajustes de saldo
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl hover:bg-stone-100 dark:hover:bg-stone-800 flex items-center justify-center text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 transition-colors min-h-[38px] min-w-[38px]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Filter Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mb-4">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por ingrediente ou observação..."
              className="w-full pl-9 pr-3 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 rounded-xl text-xs focus:border-amber-500 min-h-[38px]"
            />
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <Filter className="w-3.5 h-3.5 text-stone-400" />
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-2.5 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 rounded-xl text-xs font-medium focus:border-amber-500 min-h-[38px]"
            >
              <option value="all">Todas Origens</option>
              <option value="entrada">Entradas (Compras)</option>
              <option value="estorno">Estornos</option>
              <option value="ajuste">Ajustes / Saídas</option>
            </select>
          </div>
        </div>

        {/* Movements Table / List */}
        {filtered.length === 0 ? (
          <div className="p-8 text-center bg-stone-50 dark:bg-stone-800/40 rounded-2xl border border-stone-200 dark:border-stone-800 text-stone-500 text-xs">
            Nenhuma movimentação de estoque registrada.
          </div>
        ) : (
          <div className="border border-stone-200 dark:border-stone-800 rounded-2xl overflow-hidden max-h-96 overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 border-b border-stone-200 dark:border-stone-700">
                <tr>
                  <th className="py-2.5 px-3 font-semibold">Data / Hora</th>
                  <th className="py-2.5 px-3 font-semibold">Ingrediente</th>
                  <th className="py-2.5 px-3 font-semibold">Origem</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Movimentação</th>
                  {onEstornarMovement && <th className="py-2.5 px-3 font-semibold text-center">Ações</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 dark:divide-stone-800/80">
                {filtered.map((m) => {
                  const isEntry = m.type === 'entrada';
                  const isEstorno = m.type === 'estorno';
                  const dateStr = new Date(m.date).toLocaleString('pt-BR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  });

                  return (
                    <tr key={m.id} className="hover:bg-stone-50 dark:hover:bg-stone-800/40 transition-colors">
                      <td className="py-2.5 px-3 text-stone-500 dark:text-stone-400 whitespace-nowrap">
                        {dateStr}
                      </td>

                      <td className="py-2.5 px-3 font-bold text-stone-900 dark:text-stone-100">
                        {m.ingredientName}
                        {m.note && (
                          <span className="block text-[10px] font-normal text-stone-400 truncate max-w-xs">
                            {m.note}
                          </span>
                        )}
                      </td>

                      <td className="py-2.5 px-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-extrabold ${
                            isEntry
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : isEstorno
                              ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                          }`}
                        >
                          {isEntry ? (
                            <ArrowUpRight className="w-3 h-3 text-emerald-600" />
                          ) : isEstorno ? (
                            <RotateCcw className="w-3 h-3 text-rose-600" />
                          ) : (
                            <ArrowDownRight className="w-3 h-3 text-amber-600" />
                          )}
                          <span>{m.origin}</span>
                        </span>
                      </td>

                      <td className="py-2.5 px-3 text-right tabular-nums font-extrabold">
                        <span className={isEntry ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>
                          {m.qty > 0 ? `+${formatNumber(m.qty, 2)}` : formatNumber(m.qty, 2)} {m.unit}
                        </span>
                      </td>

                      {onEstornarMovement && (
                        <td className="py-2.5 px-3 text-center whitespace-nowrap">
                          {isEntry && m.shoppingItemId && (
                            <button
                              type="button"
                              onClick={() => onEstornarMovement(m)}
                              className="px-2 py-1 text-[10px] font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors flex items-center gap-1 mx-auto cursor-pointer"
                              title="Estornar esta entrada de estoque"
                            >
                              <RotateCcw className="w-3 h-3" />
                              <span>Estornar</span>
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-stone-100 dark:border-stone-800 mt-4 text-xs text-stone-500">
          <span>Total: <strong>{movements.length}</strong> registro(s) no histórico</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-stone-700 dark:text-stone-300 bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 rounded-xl transition-colors min-h-[38px]"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
