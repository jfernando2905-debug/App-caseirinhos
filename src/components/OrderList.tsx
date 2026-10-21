import React, { useState } from 'react';
import {
  Calendar,
  Clock,
  Phone,
  MessageCircle,
  FileDown,
  CheckCircle,
  Clock3,
  Edit2,
  Trash2,
  Plus,
  Cake,
  AlertCircle,
  ChevronRight,
  DollarSign,
  Scale,
  Sparkles,
  Eye,
} from 'lucide-react';
import { Order, OrderStatus, Recipe } from '../types';
import {
  formatItemText,
  formatDatePtBR,
  sendOrderWhatsApp,
  generateOrdersReportPdf,
} from '../utils/orderShare';
import { formatCurrency } from '../utils/calculations';
import { OrderPreviewModal } from './OrderPreviewModal';

interface OrderListProps {
  orders: Order[];
  recipes: Recipe[];
  onNewOrder: () => void;
  onEditOrder: (order: Order) => void;
  onUpdateStatus: (orderId: string, status: OrderStatus) => void;
  onDeleteOrder: (orderId: string) => void;
  onScaleOrder?: (order: Order) => void;
  onToast: (msg: string, type?: 'success' | 'info' | 'error') => void;
}

export const OrderList: React.FC<OrderListProps> = ({
  orders,
  recipes,
  onNewOrder,
  onEditOrder,
  onUpdateStatus,
  onDeleteOrder,
  onScaleOrder,
  onToast,
}) => {
  const [filter, setFilter] = useState<'abertas' | 'entregues' | 'todas'>('abertas');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [previewOrder, setPreviewOrder] = useState<Order | null>(null);

  const todayStr = new Date().toISOString().slice(0, 10);

  // Sorting: chronological by delivery date and time
  const sortedAll = [...orders].sort((a, b) => {
    const dComp = (a.entrega || '9999').localeCompare(b.entrega || '9999');
    if (dComp !== 0) return dComp;
    return (a.hora || '99:99').localeCompare(b.hora || '99:99');
  });

  const abertas = sortedAll.filter((o) => o.status !== 'entregue');
  const entregues = sortedAll.filter((o) => o.status === 'entregue').reverse();

  const paraHojeCount = abertas.filter((o) => o.entrega === todayStr).length;
  const atrasadasCount = abertas.filter((o) => o.entrega && o.entrega < todayStr).length;

  const currentList =
    filter === 'abertas' ? abertas : filter === 'entregues' ? entregues : sortedAll;

  const handleWhatsApp = async (order: Order) => {
    await sendOrderWhatsApp(
      order,
      () => {
        onToast('Texto da encomenda copiado para a área de transferência! Cole no WhatsApp.');
      },
      (err) => {
        onToast(err, 'error');
      }
    );
  };

  const handlePdf = (order: Order) => {
    setPreviewOrder(order);
  };

  const handleReportPdf = () => {
    try {
      const label =
        filter === 'abertas'
          ? 'Encomendas Abertas'
          : filter === 'entregues'
          ? 'Encomendas Entregues'
          : 'Todas as Encomendas';
      generateOrdersReportPdf(currentList, label);
      onToast(`Relatório de ${label} em PDF gerado e baixado!`);
    } catch (err: any) {
      onToast('Erro ao gerar relatório em PDF: ' + err.message, 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-stone-900 dark:text-stone-100 font-display">
            Controle de Encomendas
          </h2>
          <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-400 mt-0.5">
            Gerencie datas de entrega, vários bolos por pedido, valores e exportação em PDF.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={handleReportPdf}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-stone-700 dark:text-stone-300 bg-white dark:bg-stone-900 hover:bg-stone-50 dark:hover:bg-stone-800 border border-stone-200 dark:border-stone-800 rounded-xl shadow-xs transition-all active:scale-[0.98] min-h-[40px] sm:min-h-[42px]"
            title="Baixar relatório completo de encomendas em PDF"
          >
            <FileDown className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <span>Relatório em PDF</span>
          </button>

          <button
            onClick={onNewOrder}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-500 rounded-xl shadow-xs transition-all active:scale-[0.98] min-h-[40px] sm:min-h-[42px]"
          >
            <Plus className="w-4 h-4 shrink-0" />
            <span>Nova Encomenda</span>
          </button>
        </div>
      </div>

      {/* Summary KPIs Strip */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl sm:rounded-2xl p-2.5 sm:p-4 text-center shadow-xs">
          <b className="text-lg sm:text-2xl font-bold text-amber-700 dark:text-amber-400 block font-display tabular-nums">
            {abertas.length}
          </b>
          <span className="text-[11px] sm:text-xs text-stone-500 dark:text-stone-400 font-medium">em aberto</span>
        </div>

        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl sm:rounded-2xl p-2.5 sm:p-4 text-center shadow-xs">
          <b className="text-lg sm:text-2xl font-bold text-sky-700 dark:text-sky-400 block font-display tabular-nums">
            {paraHojeCount}
          </b>
          <span className="text-[11px] sm:text-xs text-stone-500 dark:text-stone-400 font-medium">para hoje</span>
        </div>

        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl sm:rounded-2xl p-2.5 sm:p-4 text-center shadow-xs">
          <b className="text-lg sm:text-2xl font-bold text-rose-600 dark:text-rose-400 block font-display tabular-nums">
            {atrasadasCount}
          </b>
          <span className="text-[11px] sm:text-xs text-stone-500 dark:text-stone-400 font-medium">atrasadas</span>
        </div>
      </div>

      {/* Filters Segmented Control */}
      <div className="flex items-center gap-1 p-1 bg-stone-200/60 dark:bg-stone-800 rounded-xl w-full sm:max-w-sm">
        <button
          onClick={() => setFilter('abertas')}
          className={`flex-1 py-1.5 px-2 text-xs font-semibold rounded-lg transition-colors min-h-[36px] sm:min-h-[38px] ${
            filter === 'abertas'
              ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100 shadow-xs'
              : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100'
          }`}
        >
          Abertas ({abertas.length})
        </button>
        <button
          onClick={() => setFilter('entregues')}
          className={`flex-1 py-1.5 px-2 text-xs font-semibold rounded-lg transition-colors min-h-[36px] sm:min-h-[38px] ${
            filter === 'entregues'
              ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100 shadow-xs'
              : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100'
          }`}
        >
          Entregues ({entregues.length})
        </button>
        <button
          onClick={() => setFilter('todas')}
          className={`flex-1 py-1.5 px-2 text-xs font-semibold rounded-lg transition-colors min-h-[36px] sm:min-h-[38px] ${
            filter === 'todas'
              ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100 shadow-xs'
              : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100'
          }`}
        >
          Todas ({orders.length})
        </button>
      </div>

      {/* Orders List */}
      {currentList.length === 0 ? (
        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-10 sm:p-14 text-center shadow-xs">
          <Calendar className="w-12 h-12 text-stone-300 dark:text-stone-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-stone-800 dark:text-stone-200 font-display">
            Nenhuma encomenda {filter === 'abertas' ? 'em aberto' : filter === 'entregues' ? 'entregue' : 'cadastrada'}
          </h3>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 max-w-sm mx-auto">
            {filter === 'abertas'
              ? 'Parabéns! Todas as encomendas estão em dia ou entregues.'
              : 'Cadastre suas encomendas com nome do cliente, data, bolos e valores.'}
          </p>
          <button
            onClick={onNewOrder}
            className="mt-4 px-4 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-500 rounded-xl transition-all min-h-[40px]"
          >
            + Nova Encomenda
          </button>
        </div>
      ) : (
        <div className="space-y-3.5">
          {currentList.map((order) => {
            const isLate = order.status !== 'entregue' && order.entrega && order.entrega < todayStr;
            const isToday = order.status !== 'entregue' && order.entrega === todayStr;
            const items = order.itens && order.itens.length > 0 ? order.itens : [];
            const restante =
              order.valor && order.sinal
                ? Math.max(order.valor - order.sinal, 0)
                : order.valor || 0;

            return (
              <div
                key={order.id}
                className={`bg-white dark:bg-stone-900 border rounded-2xl p-4 sm:p-5 shadow-xs transition-all hover:shadow-md ${
                  isLate
                    ? 'border-rose-300 dark:border-rose-900/60 bg-rose-50/15 dark:bg-rose-950/20'
                    : isToday
                    ? 'border-amber-300 dark:border-amber-900/60 bg-amber-50/15 dark:bg-amber-950/20'
                    : 'border-stone-200 dark:border-stone-800'
                }`}
              >
                {/* Header row: Cliente, Delivery Date and Status Badge */}
                <div className="flex items-start justify-between gap-3 mb-2.5">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base sm:text-lg font-bold text-stone-900 dark:text-stone-100 font-display">
                        {order.cliente}
                      </h3>
                      {order.telefone && (
                        <a
                          href={`tel:${order.telefone.replace(/\D/g, '')}`}
                          className="text-stone-400 hover:text-amber-700 dark:hover:text-amber-400 transition-colors p-0.5"
                          title="Ligar"
                        >
                          <Phone className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-stone-600 dark:text-stone-400 mt-0.5">
                      <span className="flex items-center gap-1 font-semibold text-stone-800 dark:text-stone-200">
                        <Calendar className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                        <span>{formatDatePtBR(order.entrega)}</span>
                        {order.hora && (
                          <span className="font-normal text-stone-500 dark:text-stone-400">às {order.hora}</span>
                        )}
                      </span>

                      {isLate && (
                        <span className="text-[11px] font-bold text-rose-600 bg-rose-100/80 px-1.5 py-0.5 rounded">
                          (atrasada)
                        </span>
                      )}

                      {isToday && (
                        <span className="text-[11px] font-bold text-amber-800 bg-amber-100/80 px-1.5 py-0.5 rounded">
                          (para hoje)
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Status Badge */}
                  <span
                    className={`text-[11px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider shrink-0 border ${
                      order.status === 'entregue'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                        : order.status === 'pronto'
                        ? 'bg-sky-50 text-sky-700 border-sky-300'
                        : 'bg-amber-50 text-amber-800 border-amber-300'
                    }`}
                  >
                    {order.status}
                  </span>
                </div>

                {/* Cakes list */}
                <div className="space-y-1 my-3 p-3 bg-stone-50 dark:bg-stone-800/60 rounded-xl border border-stone-100 dark:border-stone-800 text-xs sm:text-sm">
                  {items.map((it, idx) => (
                    <div key={idx} className="flex items-center justify-between gap-2 text-stone-800 dark:text-stone-200">
                      <span className="flex items-center gap-1.5 font-medium">
                        <span className="text-amber-700 dark:text-amber-400">🍰</span>
                        <span>{formatItemText(it)}</span>
                      </span>

                      {it.receitaId && (
                        <span className="text-[10px] text-amber-800 dark:text-amber-300 bg-amber-100/60 dark:bg-amber-950/60 px-1.5 py-0.5 rounded shrink-0">
                          Receita salva
                        </span>
                      )}
                    </div>
                  ))}
                </div>

                {/* Values & Financials */}
                {order.valor !== undefined && order.valor !== null && order.valor > 0 && (
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs py-2 px-3 bg-amber-50/40 dark:bg-amber-950/30 rounded-xl border border-amber-100/70 dark:border-amber-900/50 mb-3">
                    <div className="flex items-center gap-1.5 text-stone-700 dark:text-stone-300">
                      <DollarSign className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
                      <span>Valor total:</span>
                      <strong className="text-stone-900 dark:text-stone-100 tabular-nums text-sm">
                        {formatCurrency(order.valor)}
                      </strong>
                    </div>

                    <div className="flex items-center gap-2 text-stone-600 dark:text-stone-400">
                      {order.sinal && order.sinal > 0 ? (
                        <>
                          <span>Sinal: <strong className="text-emerald-700 dark:text-emerald-400 tabular-nums">{formatCurrency(order.sinal)}</strong></span>
                          <span>•</span>
                          <span>
                            Restante:{' '}
                            <strong className="text-amber-900 dark:text-amber-300 tabular-nums">
                              {restante > 0 ? formatCurrency(restante) : 'Quitado'}
                            </strong>
                          </span>
                        </>
                      ) : (
                        <span className="text-stone-500 dark:text-stone-400">Sem sinal pago</span>
                      )}
                    </div>
                  </div>
                )}

                {/* Observações */}
                {order.obs && (
                  <p className="text-xs text-stone-600 dark:text-stone-300 bg-stone-50/80 dark:bg-stone-800/50 p-2.5 rounded-lg border border-stone-100 dark:border-stone-800 mb-3 whitespace-pre-wrap">
                    <strong className="text-stone-700 dark:text-stone-200 font-semibold">Obs:</strong> {order.obs}
                  </p>
                )}

                {/* Action Buttons */}
                <div className="pt-2 border-t border-stone-100 dark:border-stone-800 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      onClick={() => handleWhatsApp(order)}
                      className="px-2.5 py-1.5 text-xs font-semibold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 border border-emerald-200 dark:border-emerald-800/80 rounded-lg flex items-center gap-1 transition-colors min-h-[38px]"
                      title="Enviar resumo por WhatsApp"
                    >
                      <MessageCircle className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span>WhatsApp</span>
                    </button>

                    <button
                      onClick={() => setPreviewOrder(order)}
                      className="px-2.5 py-1.5 text-xs font-semibold text-amber-900 dark:text-amber-200 bg-amber-50 dark:bg-amber-950/50 hover:bg-amber-100 dark:hover:bg-amber-900/50 border border-amber-200 dark:border-amber-800/80 rounded-lg flex items-center gap-1.5 transition-colors min-h-[38px]"
                      title="Visualizar pedido e baixar comprovante em PDF ou JPEG"
                    >
                      <Eye className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                      <span>Comprovante</span>
                    </button>

                    {/* Status shortcuts */}
                    {order.status === 'pendente' && (
                      <button
                        onClick={() => onUpdateStatus(order.id, 'pronto')}
                        className="px-2.5 py-1.5 text-xs font-semibold text-sky-800 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/50 hover:bg-sky-100 dark:hover:bg-sky-900/50 border border-sky-200 dark:border-sky-800/80 rounded-lg flex items-center gap-1 transition-colors min-h-[38px]"
                        title="Marcar bolo como pronto"
                      >
                        <CheckCircle className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                        <span>Pronto</span>
                      </button>
                    )}

                    {order.status !== 'entregue' && (
                      <button
                        onClick={() => onUpdateStatus(order.id, 'entregue')}
                        className="px-2.5 py-1.5 text-xs font-semibold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 border border-emerald-200 dark:border-emerald-800/80 rounded-lg flex items-center gap-1 transition-colors min-h-[38px]"
                        title="Marcar encomenda como entregue"
                      >
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        <span>Entregue</span>
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => onEditOrder(order)}
                      className="px-3 py-1.5 text-xs font-semibold text-stone-700 dark:text-stone-300 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 rounded-lg transition-colors flex items-center gap-1 min-h-[38px]"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Editar</span>
                    </button>

                    <button
                      onClick={() => setDeleteConfirmId(order.id)}
                      className="px-2.5 py-1.5 text-xs font-semibold text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition-colors flex items-center gap-1 min-h-[38px]"
                      title="Excluir encomenda"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl border border-stone-200">
            <h3 className="text-lg font-bold text-stone-900 font-display flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-rose-600" />
              <span>Excluir Encomenda?</span>
            </h3>
            <p className="text-sm text-stone-600 mt-2">
              Tem certeza que deseja apagar esta encomenda? Esta ação não pode ser desfeita.
            </p>
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-xl min-h-[42px]"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  onDeleteOrder(deleteConfirmId);
                  setDeleteConfirmId(null);
                }}
                className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl min-h-[42px]"
              >
                Confirmar Exclusão
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Order Preview & Export Modal (PDF / JPEG) */}
      <OrderPreviewModal
        order={previewOrder}
        isOpen={Boolean(previewOrder)}
        onClose={() => setPreviewOrder(null)}
        onToast={onToast}
      />
    </div>
  );
};
