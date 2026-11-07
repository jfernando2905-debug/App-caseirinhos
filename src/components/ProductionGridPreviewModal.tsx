import React, { useState, useMemo } from 'react';
import {
  X,
  Printer,
  FileDown,
  Calendar,
  CheckSquare,
  Square,
  Clock,
  User,
  Cake,
  ClipboardList,
} from 'lucide-react';
import { Order, Recipe } from '../types';
import { formatDatePtBR } from '../utils/dateUtils';
import { formatCurrency } from '../utils/calculations';

interface ProductionGridPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  orders: Order[];
  recipes: Recipe[];
  onUpdateStatus?: (orderId: string, newStatus: 'pendente' | 'pronto' | 'entregue') => void;
  onToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const ProductionGridPreviewModal: React.FC<ProductionGridPreviewModalProps> = ({
  isOpen,
  onClose,
  orders,
  recipes,
  onUpdateStatus,
  onToast,
}) => {
  // Production completion checklist state (orderId -> boolean or itemKey -> boolean)
  const [completedItems, setCompletedItems] = useState<Record<string, boolean>>({});

  const openOrders = useMemo(() => {
    return (orders || []).filter((o) => (o.status || 'pendente') !== 'entregue');
  }, [orders]);

  const toggleItemComplete = (key: string, orderId: string, currentStatus: string) => {
    setCompletedItems((prev) => {
      const nextVal = !prev[key];
      if (nextVal && currentStatus === 'pendente' && onUpdateStatus) {
        onUpdateStatus(orderId, 'pronto');
        if (onToast) onToast(`Encomenda marcada como PRONTA!`);
      }
      return {
        ...prev,
        [key]: nextVal,
      };
    });
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportPdf = () => {
    window.print();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-4xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[94vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:px-6 border-b border-stone-100 dark:border-stone-800 bg-stone-50/80 dark:bg-stone-900 shrink-0 no-print">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <ClipboardList className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-stone-900 dark:text-stone-100 font-display">
                Grade de Produção — Pré-visualização & Impressão
              </h2>
              <p className="text-[11px] text-stone-500 dark:text-stone-400">
                Grade de produção formatada para folha A4 com caixas de marcação [ ] para acompanhamento na cozinha.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 rounded-xl hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors min-h-[38px] min-w-[38px] flex items-center justify-center cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Printable Document Sheet Preview */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-stone-200/50 dark:bg-stone-950/80">
          <div className="max-w-3xl mx-auto bg-white text-stone-900 p-6 sm:p-8 rounded-2xl shadow-lg border border-stone-200 text-xs sm:text-sm printable-area">
            {/* Sheet Header */}
            <div className="border-b-2 border-amber-500 pb-4 mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="text-[10px] uppercase tracking-wider font-extrabold text-amber-700 block">
                  Caseirinhos Fer&Dre · Cozinha & Confeitaria
                </span>
                <h1 className="text-lg sm:text-xl font-bold font-display text-stone-900">
                  GRADE DE PRODUÇÃO DE BOLOS (CHECKLIST)
                </h1>
                <p className="text-xs text-stone-500 mt-0.5">
                  Encomendas em Aberto • Total: <strong>{openOrders.length} pedido(s)</strong>
                </p>
              </div>

              <div className="text-left sm:text-right text-xs text-stone-500">
                <p>Data de Produção: <strong>{new Date().toLocaleDateString('pt-BR')}</strong></p>
                <p>Impresso às: {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
              </div>
            </div>

            {/* Orders Checklist Table */}
            {openOrders.length === 0 ? (
              <div className="py-12 text-center text-stone-500 border border-dashed border-stone-200 rounded-xl">
                Nenhuma encomenda em aberto no momento.
              </div>
            ) : (
              <div className="border border-stone-300 rounded-xl overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-stone-100 border-b border-stone-300 text-stone-800 text-[11px] font-bold uppercase tracking-wider">
                      <th className="py-3 px-3 text-center w-12 border-r border-stone-300">OK</th>
                      <th className="py-3 px-3 border-r border-stone-300">Data / Hora</th>
                      <th className="py-3 px-3 border-r border-stone-300">Cliente / Contato</th>
                      <th className="py-3 px-3 border-r border-stone-300">Produto & Tamanho do Bolo (Obrigatório)</th>
                      <th className="py-3 px-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-200 text-xs">
                    {openOrders.map((ord, oIdx) => {
                      const items = ord.itens || [];

                      return items.map((it, iIdx) => {
                        const itemKey = `${ord.id}__${iIdx}`;
                        const isDone = !!completedItems[itemKey] || ord.status === 'pronto';

                        return (
                          <tr
                            key={itemKey}
                            className={`${isDone ? 'bg-amber-50/50 text-stone-400 line-through' : oIdx % 2 === 1 ? 'bg-stone-50/50' : 'bg-white'}`}
                          >
                            <td className="py-3 px-3 text-center border-r border-stone-200 align-top">
                              <button
                                type="button"
                                onClick={() => toggleItemComplete(itemKey, ord.id, ord.status)}
                                className="inline-flex items-center justify-center cursor-pointer p-0.5"
                                title="Marcar como produzido / pronto"
                              >
                                {isDone ? (
                                  <CheckSquare className="w-5 h-5 text-amber-600 no-print" />
                                ) : (
                                  <Square className="w-5 h-5 text-stone-400 no-print" />
                                )}
                                <span className="print-only inline-block font-mono font-bold text-sm">
                                  {isDone ? '[X]' : '[  ]'}
                                </span>
                              </button>
                            </td>

                            {iIdx === 0 && (
                              <>
                                <td rowSpan={items.length} className="py-3 px-3 align-top font-bold text-stone-900 border-r border-stone-200 whitespace-nowrap">
                                  <div>{formatDatePtBR(ord.entrega)}</div>
                                  {ord.hora && <div className="text-[11px] font-normal text-stone-600">às {ord.hora}</div>}
                                </td>

                                <td rowSpan={items.length} className="py-3 px-3 align-top border-r border-stone-200">
                                  <div className="font-extrabold text-stone-900">{ord.cliente}</div>
                                  {ord.telefone && <div className="text-[11px] text-stone-600">{ord.telefone}</div>}
                                </td>
                              </>
                            )}

                            <td className="py-3 px-3 align-top border-r border-stone-200 space-y-0.5">
                              <div>
                                <span className="font-extrabold text-stone-900 text-sm">
                                  {it.qtd > 1 ? `${it.qtd}× ` : ''}{it.tipo}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                                <span className="px-2 py-0.5 bg-amber-100 text-amber-950 font-black text-xs rounded border border-amber-300">
                                  Tamanho: {it.tamanho || 'Padrão'}
                                </span>
                                <span className="font-semibold text-stone-800">
                                  {it.sabor || 'Sabor não informado'}
                                </span>
                              </div>
                              {ord.adicionais && iIdx === items.length - 1 && (
                                <div className="text-[11px] text-amber-900 italic font-medium mt-1">
                                  ✨ Adicionais: {ord.adicionais}
                                </div>
                              )}
                              {ord.obs && iIdx === items.length - 1 && (
                                <div className="text-[11px] text-stone-600 italic mt-0.5">
                                  Obs: {ord.obs}
                                </div>
                              )}
                            </td>

                            {iIdx === 0 && (
                              <td rowSpan={items.length} className="py-3 px-3 text-center align-top whitespace-nowrap">
                                <span
                                  className={`inline-block text-[10px] font-black px-2 py-0.5 rounded-full uppercase ${
                                    isDone || ord.status === 'pronto'
                                      ? 'bg-sky-100 text-sky-900 border border-sky-300'
                                      : 'bg-amber-100 text-amber-950 border border-amber-300'
                                  }`}
                                >
                                  {isDone ? 'PRONTO' : ord.status}
                                </span>
                              </td>
                            )}
                          </tr>
                        );
                      });
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Document Footer */}
            <div className="mt-6 pt-4 border-t border-stone-200 flex justify-between items-center text-[10px] text-stone-500">
              <span>Caseirinhos Fer&Dre — Grade de Produção (Acompanhamento Cozinha)</span>
              <span>Página 1 de 1</span>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:px-6 bg-stone-50 dark:bg-stone-900 border-t border-stone-100 dark:border-stone-800 flex flex-wrap items-center justify-between gap-3 shrink-0 no-print">
          <div className="text-xs text-stone-500">
            Você pode marcar os itens produzidos diretamente na tela ou imprimir a grade para preenchimento a caneta.
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-500 rounded-xl shadow-xs transition-all active:scale-[0.98] min-h-[40px] cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir / PDF da Grade</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
