import React from 'react';
import { AlertTriangle, X, ShoppingCart, Boxes, Egg } from 'lucide-react';
import { Order } from '../types';
import { MissingStockItem } from '../utils/orderStockDeduction';

interface StockInsufficientModalProps {
  order: Order;
  missingItems: MissingStockItem[];
  isOpen: boolean;
  onClose: () => void;
  onNavigateToShopping?: () => void;
}

export const StockInsufficientModal: React.FC<StockInsufficientModalProps> = ({
  order,
  missingItems,
  isOpen,
  onClose,
  onNavigateToShopping,
}) => {
  if (!isOpen) return null;

  const insumosMissing = missingItems.filter((i) => i.type === 'insumo');
  const embalagensMissing = missingItems.filter((i) => i.type === 'embalagem');

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl max-w-lg w-full p-4 sm:p-6 shadow-2xl space-y-4 my-6 animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-start justify-between gap-3 border-b border-rose-100 dark:border-rose-950/60 pb-3">
          <div className="flex items-center gap-2.5 text-rose-600 dark:text-rose-400">
            <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-950/80 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-stone-900 dark:text-stone-100 font-display leading-tight">
                Estoque Insuficiente
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                Encomenda de <strong>{order.cliente}</strong>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-600 dark:hover:text-stone-200"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Warning Banner */}
        <div className="p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-xl text-xs text-rose-900 dark:text-rose-200 leading-relaxed space-y-1">
          <p className="font-semibold">
            Não é possível marcar a encomenda como <strong>"Pronto"</strong> sem estoque disponível.
          </p>
          <p className="text-[11px] text-rose-800/90 dark:text-rose-300">
            A baixa automática de ingredientes e embalagens foi bloqueada para evitar saldo negativo silencioso. Reponha o estoque para continuar.
          </p>
        </div>

        {/* Insumos Faltantes */}
        {insumosMissing.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-stone-800 dark:text-stone-200 uppercase tracking-wider flex items-center gap-1.5">
              <Egg className="w-3.5 h-3.5 text-amber-600" />
              <span>Ingredientes Faltantes ({insumosMissing.length})</span>
            </h4>

            <div className="border border-stone-200 dark:border-stone-800 rounded-xl overflow-hidden text-xs">
              <table className="w-full text-left">
                <thead className="bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 font-medium">
                  <tr>
                    <th className="py-2 px-3">Item</th>
                    <th className="py-2 px-3 text-right">Necessário</th>
                    <th className="py-2 px-3 text-right">Em Estoque</th>
                    <th className="py-2 px-3 text-right text-rose-600 dark:text-rose-400 font-bold">Falta</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                  {insumosMissing.map((item) => (
                    <tr key={item.id} className="hover:bg-stone-50 dark:hover:bg-stone-850">
                      <td className="py-2 px-3 font-semibold text-stone-800 dark:text-stone-200">
                        {item.name}
                      </td>
                      <td className="py-2 px-3 text-right tabular-nums text-stone-600 dark:text-stone-400">
                        {item.formattedRequired}
                      </td>
                      <td className="py-2 px-3 text-right tabular-nums text-stone-600 dark:text-stone-400">
                        {item.formattedAvailable}
                      </td>
                      <td className="py-2 px-3 text-right font-bold tabular-nums text-rose-600 dark:text-rose-400">
                        {item.formattedMissing}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Embalagens Faltantes */}
        {embalagensMissing.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-stone-800 dark:text-stone-200 uppercase tracking-wider flex items-center gap-1.5">
              <Boxes className="w-3.5 h-3.5 text-amber-600" />
              <span>Embalagens Faltantes ({embalagensMissing.length})</span>
            </h4>

            <div className="border border-stone-200 dark:border-stone-800 rounded-xl overflow-hidden text-xs">
              <table className="w-full text-left">
                <thead className="bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 font-medium">
                  <tr>
                    <th className="py-2 px-3">Embalagem</th>
                    <th className="py-2 px-3 text-right">Necessário</th>
                    <th className="py-2 px-3 text-right">Em Estoque</th>
                    <th className="py-2 px-3 text-right text-rose-600 dark:text-rose-400 font-bold">Falta</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                  {embalagensMissing.map((item) => (
                    <tr key={item.id} className="hover:bg-stone-50 dark:hover:bg-stone-850">
                      <td className="py-2 px-3 font-semibold text-stone-800 dark:text-stone-200">
                        {item.name}
                      </td>
                      <td className="py-2 px-3 text-right tabular-nums text-stone-600 dark:text-stone-400">
                        {item.formattedRequired}
                      </td>
                      <td className="py-2 px-3 text-right tabular-nums text-stone-600 dark:text-stone-400">
                        {item.formattedAvailable}
                      </td>
                      <td className="py-2 px-3 text-right font-bold tabular-nums text-rose-600 dark:text-rose-400">
                        {item.formattedMissing}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-end gap-2 pt-3 border-t border-stone-100 dark:border-stone-800">
          {onNavigateToShopping && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onNavigateToShopping();
              }}
              className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-bold text-amber-900 dark:text-amber-300 bg-amber-100 hover:bg-amber-200 dark:bg-amber-950/70 dark:hover:bg-amber-900/80 rounded-xl transition-colors min-h-[42px]"
            >
              <ShoppingCart className="w-4 h-4 text-amber-700 dark:text-amber-400" />
              <span>Ir para Lista de Compras</span>
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2.5 text-xs font-bold text-white bg-stone-800 hover:bg-stone-700 rounded-xl transition-colors min-h-[42px]"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};
