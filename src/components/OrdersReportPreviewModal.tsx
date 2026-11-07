import React, { useState, useMemo } from 'react';
import {
  X,
  Printer,
  FileDown,
  Calendar,
  Filter,
  CheckCircle,
  Clock,
  AlertTriangle,
  User,
  ShoppingBag,
} from 'lucide-react';
import { Order } from '../types';
import { formatDatePtBR, generateOrdersReportPdf } from '../utils/orderShare';
import { formatCurrency } from '../utils/calculations';

interface OrdersReportPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  orders: Order[];
  onToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const OrdersReportPreviewModal: React.FC<OrdersReportPreviewModalProps> = ({
  isOpen,
  onClose,
  orders,
  onToast,
}) => {
  const [filter, setFilter] = useState<'abertas' | 'entregues' | 'todas'>('abertas');

  const filteredOrders = useMemo(() => {
    const list = orders || [];
    if (filter === 'abertas') return list.filter((o) => (o.status || 'pendente') !== 'entregue');
    if (filter === 'entregues') return list.filter((o) => (o.status || 'pendente') === 'entregue');
    return list;
  }, [orders, filter]);

  const summary = useMemo(() => {
    let totalValor = 0;
    let totalSinal = 0;
    let totalRestante = 0;
    const statusCounts = { pendente: 0, pronto: 0, entregue: 0 };

    for (const o of filteredOrders) {
      const val = o.valor || 0;
      const sin = o.sinal || 0;
      totalValor += val;
      totalSinal += sin;
      totalRestante += Math.max(val - sin, 0);

      const st = (o.status || 'pendente') as 'pendente' | 'pronto' | 'entregue';
      if (statusCounts[st] !== undefined) {
        statusCounts[st] = (statusCounts[st] || 0) + 1;
      } else {
        statusCounts.pendente = (statusCounts.pendente || 0) + 1;
      }
    }

    return {
      totalValor,
      totalSinal,
      totalRestante,
      statusCounts,
    };
  }, [filteredOrders]);

  const handlePrint = () => {
    window.print();
  };

  const handleExportPdf = () => {
    const label =
      filter === 'abertas'
        ? 'Encomendas Abertas'
        : filter === 'entregues'
        ? 'Encomendas Entregues'
        : 'Todas as Encomendas';
    try {
      generateOrdersReportPdf(filteredOrders, label);
      if (onToast) onToast(`Relatório de ${label} em PDF exportado com sucesso!`);
    } catch (err: any) {
      if (onToast) onToast('Erro ao exportar PDF: ' + err.message, 'error');
    }
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
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-stone-900 dark:text-stone-100 font-display">
                Pré-visualização do Relatório de Encomendas
              </h2>
              <p className="text-[11px] text-stone-500 dark:text-stone-400">
                Confira as informações organizadas por data, cliente, bolos e tamanhos antes de imprimir ou baixar em PDF.
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

        {/* Filter Controls Bar */}
        <div className="p-3 sm:px-6 bg-stone-100/60 dark:bg-stone-950/40 border-b border-stone-100 dark:border-stone-800 flex flex-wrap items-center justify-between gap-3 shrink-0 no-print">
          <div className="flex items-center gap-1.5">
            <Filter className="w-4 h-4 text-stone-400" />
            <span className="text-xs font-semibold text-stone-700 dark:text-stone-300">Filtro de Encomendas:</span>
            <div className="inline-flex rounded-xl bg-white dark:bg-stone-800 p-0.5 border border-stone-200 dark:border-stone-700 text-xs ml-1">
              <button
                onClick={() => setFilter('abertas')}
                className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                  filter === 'abertas'
                    ? 'bg-amber-600 text-white shadow-2xs'
                    : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
                }`}
              >
                Abertas ({orders.filter((o) => o.status !== 'entregue').length})
              </button>
              <button
                onClick={() => setFilter('entregues')}
                className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                  filter === 'entregues'
                    ? 'bg-amber-600 text-white shadow-2xs'
                    : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
                }`}
              >
                Entregues ({orders.filter((o) => o.status === 'entregue').length})
              </button>
              <button
                onClick={() => setFilter('todas')}
                className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                  filter === 'todas'
                    ? 'bg-amber-600 text-white shadow-2xs'
                    : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
                }`}
              >
                Todas ({orders.length})
              </button>
            </div>
          </div>

          <span className="text-xs text-stone-500 font-medium">
            Exibindo {filteredOrders.length} encomenda(s)
          </span>
        </div>

        {/* Printable Document Sheet Preview */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-stone-200/50 dark:bg-stone-950/80">
          <div className="max-w-3xl mx-auto bg-white text-stone-900 p-6 sm:p-8 rounded-2xl shadow-lg border border-stone-200 text-xs sm:text-sm printable-area">
            {/* Sheet Header */}
            <div className="border-b border-stone-200 pb-4 mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="text-[10px] uppercase tracking-wider font-extrabold text-amber-700 block">
                  Caseirinhos Fer&Dre · Confeitaria
                </span>
                <h1 className="text-lg sm:text-xl font-bold font-display text-stone-900">
                  RELATÓRIO DE ENCOMENDAS DE BOLOS
                </h1>
                <p className="text-xs text-stone-500 mt-0.5">
                  Filtro: <strong className="text-stone-800 uppercase">{filter}</strong> • {filteredOrders.length} pedido(s)
                </p>
              </div>

              <div className="text-left sm:text-right text-xs text-stone-500">
                <p>Emissão: <strong>{new Date().toLocaleDateString('pt-BR')}</strong></p>
                <p>Horário: {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
              </div>
            </div>

            {/* Summary Metrics Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 bg-amber-50/60 border border-amber-200 rounded-xl mb-5 text-center">
              <div>
                <span className="text-[10px] font-bold text-stone-500 uppercase block">Qtd Encomendas</span>
                <strong className="text-sm font-extrabold text-stone-900 tabular-nums">{filteredOrders.length}</strong>
              </div>
              <div>
                <span className="text-[10px] font-bold text-stone-500 uppercase block">Valor Total</span>
                <strong className="text-sm font-extrabold text-amber-800 tabular-nums">{formatCurrency(summary.totalValor)}</strong>
              </div>
              <div>
                <span className="text-[10px] font-bold text-stone-500 uppercase block">Sinais Pagos</span>
                <strong className="text-sm font-extrabold text-emerald-800 tabular-nums">{formatCurrency(summary.totalSinal)}</strong>
              </div>
              <div>
                <span className="text-[10px] font-bold text-stone-500 uppercase block">Restante a Receber</span>
                <strong className="text-sm font-extrabold text-rose-800 tabular-nums">{formatCurrency(summary.totalRestante)}</strong>
              </div>
            </div>

            {/* Orders Table */}
            {filteredOrders.length === 0 ? (
              <div className="py-12 text-center text-stone-500 border border-dashed border-stone-200 rounded-xl">
                Nenhuma encomenda encontrada neste filtro.
              </div>
            ) : (
              <div className="border border-stone-200 rounded-xl overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-stone-100 border-b border-stone-200 text-stone-700 text-[11px] font-bold uppercase tracking-wider">
                      <th className="py-2.5 px-3">Entrega</th>
                      <th className="py-2.5 px-3">Cliente / Contato</th>
                      <th className="py-2.5 px-3">Bolos & Tamanhos (Obrigatório)</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3 text-right">Valor Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 text-xs">
                    {filteredOrders.map((ord, idx) => {
                      const items = ord.itens || [];
                      const restante = Math.max((ord.valor || 0) - (ord.sinal || 0), 0);

                      return (
                        <tr key={ord.id || idx} className={idx % 2 === 1 ? 'bg-stone-50/50' : 'bg-white'}>
                          <td className="py-2.5 px-3 align-top font-semibold text-stone-900 whitespace-nowrap">
                            <div>{formatDatePtBR(ord.entrega)}</div>
                            {ord.hora && <div className="text-[11px] font-normal text-stone-500">às {ord.hora}</div>}
                          </td>

                          <td className="py-2.5 px-3 align-top">
                            <div className="font-bold text-stone-900">{ord.cliente}</div>
                            {ord.telefone && <div className="text-[11px] text-stone-500">{ord.telefone}</div>}
                          </td>

                          <td className="py-2.5 px-3 align-top space-y-1">
                            {items.map((it, iIdx) => (
                              <div key={iIdx} className="leading-snug">
                                <span className="font-semibold text-stone-900">
                                  {it.qtd > 1 ? `${it.qtd}× ` : ''}{it.tipo}
                                </span>
                                <span className="inline-block mx-1 px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 font-extrabold text-[10px]">
                                  Tamanho: {it.tamanho || 'Padrão'}
                                </span>
                                <span className="text-stone-600">
                                  — {it.sabor || 'Sabor não especificado'}
                                </span>
                              </div>
                            ))}
                            {ord.adicionais && (
                              <div className="text-[11px] text-amber-900 italic">
                                ✨ Adicionais: {ord.adicionais} {ord.valorAdicionais ? `(+${formatCurrency(ord.valorAdicionais)})` : ''}
                              </div>
                            )}
                            {ord.obs && (
                              <div className="text-[11px] text-stone-500 italic">
                                Obs: {ord.obs}
                              </div>
                            )}
                          </td>

                          <td className="py-2.5 px-3 align-top whitespace-nowrap">
                            <span
                              className={`inline-block text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase ${
                                ord.status === 'entregue'
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                  : ord.status === 'pronto'
                                  ? 'bg-sky-100 text-sky-800 border border-sky-300'
                                  : 'bg-amber-100 text-amber-900 border border-amber-300'
                              }`}
                            >
                              {ord.status}
                            </span>
                            <div className="text-[10px] text-stone-500 mt-1 font-medium">
                              {ord.pago ? '✅ Pago' : `⏳ Resta: ${formatCurrency(restante)}`}
                            </div>
                          </td>

                          <td className="py-2.5 px-3 align-top text-right whitespace-nowrap">
                            <div className="font-extrabold text-stone-900 tabular-nums">{formatCurrency(ord.valor || 0)}</div>
                            {ord.sinal && ord.sinal > 0 ? (
                              <div className="text-[10px] text-stone-500">Sinal: {formatCurrency(ord.sinal)}</div>
                            ) : null}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Document Footer */}
            <div className="mt-6 pt-4 border-t border-stone-200 flex justify-between items-center text-[10px] text-stone-400">
              <span>Caseirinhos Fer&Dre — Relatório de Encomendas</span>
              <span>Página 1 de 1</span>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:px-6 bg-stone-50 dark:bg-stone-900 border-t border-stone-100 dark:border-stone-800 flex flex-wrap items-center justify-between gap-3 shrink-0 no-print">
          <div className="text-xs text-stone-500">
            Você pode imprimir em A4 ou salvar em PDF diretamente pelo seu navegador.
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-stone-800 dark:text-stone-200 bg-white dark:bg-stone-800 hover:bg-stone-100 dark:hover:bg-stone-700 border border-stone-200 dark:border-stone-700 rounded-xl transition-all min-h-[40px] cursor-pointer"
            >
              <Printer className="w-4 h-4 text-stone-600 dark:text-stone-400" />
              <span>Imprimir</span>
            </button>

            <button
              onClick={handleExportPdf}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-500 rounded-xl shadow-xs transition-all active:scale-[0.98] min-h-[40px] cursor-pointer"
            >
              <FileDown className="w-4 h-4" />
              <span>Exportar PDF</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
