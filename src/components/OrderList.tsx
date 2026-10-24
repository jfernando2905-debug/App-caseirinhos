import React, { useState } from 'react';
import {
  Calendar,
  Phone,
  MessageCircle,
  FileDown,
  CheckCircle,
  Edit2,
  Trash2,
  Plus,
  AlertCircle,
  DollarSign,
  Eye,
  ChevronDown,
  ChevronsUpDown,
  RotateCcw,
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
  recipes: _recipes,
  onNewOrder,
  onEditOrder,
  onUpdateStatus,
  onDeleteOrder,
  onScaleOrder: _onScaleOrder,
  onToast,
}) => {
  const [filter, setFilter] = useState<'abertas' | 'entregues' | 'todas'>('abertas');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [previewOrder, setPreviewOrder] = useState<Order | null>(null);

  // Set of collapsed order IDs (persisted in localStorage)
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('app_orders_collapsed_ids');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });

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

  const allCollapsed =
    currentList.length > 0 && currentList.every((o) => collapsedIds.has(o.id));

  const toggleAllCollapse = () => {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (allCollapsed) {
        currentList.forEach((o) => next.delete(o.id));
      } else {
        currentList.forEach((o) => next.add(o.id));
      }
      try {
        localStorage.setItem('app_orders_collapsed_ids', JSON.stringify(Array.from(next)));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const toggleCardCollapse = (orderId: string) => {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(orderId)) {
        next.delete(orderId);
      } else {
        next.add(orderId);
      }
      try {
        localStorage.setItem('app_orders_collapsed_ids', JSON.stringify(Array.from(next)));
      } catch {
        // ignore
      }
      return next;
    });
  };

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
            Gerencie datas de entrega, itens por pedido, valores e exportação de comprovantes.
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

      {/* Filter and View Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        {/* Segmented Control */}
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

        {/* Global Collapse / Expand Toggle */}
        {currentList.length > 0 && (
          <button
            onClick={toggleAllCollapse}
            className="flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-stone-700 dark:text-stone-300 bg-white dark:bg-stone-900 hover:bg-stone-50 dark:hover:bg-stone-800 border border-stone-200 dark:border-stone-800 rounded-xl transition-all shadow-2xs min-h-[38px] self-end sm:self-auto"
            title={allCollapsed ? 'Expandir todos os cards' : 'Recolher todos os cards para visualização compacta'}
          >
            <ChevronsUpDown className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
            <span>{allCollapsed ? 'Expandir Todos' : 'Recolher Todos'}</span>
          </button>
        )}
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
        <div className="space-y-3">
          {currentList.map((order) => {
            const isLate = order.status !== 'entregue' && order.entrega && order.entrega < todayStr;
            const isToday = order.status !== 'entregue' && order.entrega === todayStr;
            const items = order.itens && order.itens.length > 0 ? order.itens : [];
            const isCollapsed = collapsedIds.has(order.id);
            const restante =
              order.valor && order.sinal
                ? Math.max(order.valor - order.sinal, 0)
                : order.valor || 0;

            return (
              <div
                key={order.id}
                className={`bg-white dark:bg-stone-900 border rounded-2xl shadow-xs transition-all hover:shadow-md ${
                  isLate
                    ? 'border-rose-300 dark:border-rose-900/60 bg-rose-50/15 dark:bg-rose-950/20'
                    : isToday
                    ? 'border-amber-300 dark:border-amber-900/60 bg-amber-50/15 dark:bg-amber-950/20'
                    : 'border-stone-200 dark:border-stone-800'
                } ${isCollapsed ? 'p-3.5 sm:p-4' : 'p-4 sm:p-5'}`}
              >
                {/* Header row: Click to expand / collapse */}
                <div
                  onClick={() => toggleCardCollapse(order.id)}
                  className="flex items-start sm:items-center justify-between gap-2.5 cursor-pointer select-none"
                  title={isCollapsed ? 'Clique para expandir os detalhes da encomenda' : 'Clique para recolher'}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base sm:text-lg font-bold text-stone-900 dark:text-stone-100 font-display">
                        {order.cliente}
                      </h3>

                      {order.telefone && (
                        <a
                          href={`tel:${order.telefone.replace(/\D/g, '')}`}
                          onClick={(e) => e.stopPropagation()}
                          className="text-stone-400 hover:text-amber-700 dark:hover:text-amber-400 transition-colors p-0.5"
                          title="Ligar para o cliente"
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
                        <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 bg-rose-100/80 dark:bg-rose-950/70 px-1.5 py-0.2 rounded">
                          (atrasada)
                        </span>
                      )}

                      {isToday && (
                        <span className="text-[10px] font-bold text-amber-800 dark:text-amber-400 bg-amber-100/80 dark:bg-amber-950/70 px-1.5 py-0.2 rounded">
                          (para hoje)
                        </span>
                      )}

                      {isCollapsed && items.length > 0 && (
                        <span className="text-[11px] text-stone-500 dark:text-stone-400 hidden xs:inline">
                          · {items.length} {items.length === 1 ? 'item' : 'itens'}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Header Right: Value, Status Badge & Collapse Chevron */}
                  <div className="flex items-center gap-2 shrink-0">
                    {order.valor !== undefined && order.valor !== null && order.valor > 0 && (
                      <span className="text-xs sm:text-sm font-bold text-stone-900 dark:text-stone-100 tabular-nums">
                        {formatCurrency(order.valor)}
                      </span>
                    )}

                    {/* Status Badge */}
                    <span
                      className={`text-[10px] sm:text-[11px] font-bold px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full uppercase tracking-wider shrink-0 border ${
                        order.status === 'entregue'
                          ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                          : order.status === 'pronto'
                          ? 'bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 border-sky-300 dark:border-sky-800'
                          : 'bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800'
                      }`}
                    >
                      {order.status}
                    </span>

                    {/* Chevron toggle icon */}
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 transition-colors"
                      title={isCollapsed ? 'Expandir card' : 'Recolher card'}
                    >
                      <ChevronDown
                        className={`w-4 h-4 transition-transform duration-200 ${
                          isCollapsed ? '' : 'rotate-180'
                        }`}
                      />
                    </div>
                  </div>
                </div>

                {/* Collapsible Details: Items, Financials, Notes, and Redesigned Action Buttons */}
                {!isCollapsed && (
                  <div className="mt-3 pt-3 border-t border-stone-100 dark:border-stone-800/80 space-y-3 animate-fade-in">
                    {/* Cakes list */}
                    <div className="space-y-1.5 p-3 bg-stone-50 dark:bg-stone-800/60 rounded-xl border border-stone-100 dark:border-stone-800 text-xs sm:text-sm">
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
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs py-2 px-3 bg-amber-50/40 dark:bg-amber-950/30 rounded-xl border border-amber-100/70 dark:border-amber-900/50">
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
                      <p className="text-xs text-stone-600 dark:text-stone-300 bg-stone-50/80 dark:bg-stone-800/50 p-2.5 rounded-xl border border-stone-100 dark:border-stone-800 whitespace-pre-wrap">
                        <strong className="text-stone-700 dark:text-stone-200 font-semibold">Obs:</strong> {order.obs}
                      </p>
                    )}

                    {/* Redesigned Button Layout */}
                    <div className="space-y-2 pt-1">
                      {/* Row 1: Status Progression Buttons (clean, balanced & prominent) */}
                      {order.status !== 'entregue' ? (
                        <div className="grid grid-cols-2 gap-2">
                          {order.status === 'pendente' && (
                            <button
                              onClick={() => onUpdateStatus(order.id, 'pronto')}
                              className="flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-semibold text-sky-800 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/60 hover:bg-sky-100 dark:hover:bg-sky-900/60 border border-sky-200 dark:border-sky-800 rounded-xl transition-all shadow-2xs active:scale-[0.98] min-h-[40px]"
                              title="Marcar encomenda como Pronta para entrega"
                            >
                              <CheckCircle className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0" />
                              <span>Marcar Pronto</span>
                            </button>
                          )}

                          <button
                            onClick={() => onUpdateStatus(order.id, 'entregue')}
                            className={`flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-semibold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-800 rounded-xl transition-all shadow-2xs active:scale-[0.98] min-h-[40px] ${
                              order.status === 'pronto' ? 'col-span-2' : ''
                            }`}
                            title="Marcar encomenda como Entregue ao cliente"
                          >
                            <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                            <span>Marcar Entregue</span>
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between py-1 px-2.5 bg-emerald-50/50 dark:bg-emerald-950/30 rounded-xl border border-emerald-100 dark:border-emerald-900/40 text-xs text-emerald-800 dark:text-emerald-300">
                          <span className="flex items-center gap-1.5 font-medium">
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                            <span>Encomenda concluída e entregue</span>
                          </span>

                          <button
                            onClick={() => onUpdateStatus(order.id, 'pendente')}
                            className="text-[11px] font-semibold text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 flex items-center gap-1 p-1 transition-colors"
                            title="Reabrir encomenda para pendente"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>Reabrir</span>
                          </button>
                        </div>
                      )}

                      {/* Row 2: Secondary Action Toolbar (WhatsApp, Comprovante, Editar, Excluir) */}
                      <div className="flex items-center justify-between gap-1.5 pt-1">
                        <div className="flex items-center gap-1.5 flex-1">
                          <button
                            onClick={() => handleWhatsApp(order)}
                            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-emerald-800 dark:text-emerald-300 bg-emerald-50/70 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 border border-emerald-200/90 dark:border-emerald-800/80 rounded-xl transition-colors min-h-[40px]"
                            title="Enviar resumo por WhatsApp"
                          >
                            <MessageCircle className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                            <span>WhatsApp</span>
                          </button>

                          <button
                            onClick={() => setPreviewOrder(order)}
                            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-amber-900 dark:text-amber-200 bg-amber-50/70 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/50 border border-amber-200/90 dark:border-amber-800/80 rounded-xl transition-colors min-h-[40px]"
                            title="Visualizar pedido e baixar comprovante em PDF ou JPEG"
                          >
                            <Eye className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                            <span>Comprovante</span>
                          </button>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={() => onEditOrder(order)}
                            className="flex items-center justify-center gap-1 px-3 py-2 text-xs font-semibold text-stone-700 dark:text-stone-300 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 rounded-xl transition-colors min-h-[40px]"
                            title="Editar dados da encomenda"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            <span>Editar</span>
                          </button>

                          <button
                            onClick={() => setDeleteConfirmId(order.id)}
                            className="flex items-center justify-center p-2 text-stone-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-xl transition-colors min-h-[40px] min-w-[40px]"
                            title="Excluir encomenda"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 rounded-2xl max-w-sm w-full p-6 shadow-xl border border-stone-200 dark:border-stone-800">
            <h3 className="text-lg font-bold text-stone-900 dark:text-stone-100 font-display flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400" />
              <span>Excluir Encomenda?</span>
            </h3>
            <p className="text-sm text-stone-600 dark:text-stone-300 mt-2">
              Tem certeza que deseja apagar esta encomenda? Esta ação não pode ser desfeita.
            </p>
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 text-xs font-semibold text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-xl min-h-[42px]"
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
