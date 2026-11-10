import React, { useState, useMemo } from 'react';
import {
  X,
  Printer,
  FileDown,
  Calendar,
  Filter,
  BarChart3,
  TrendingUp,
  DollarSign,
  PackageCheck,
  CheckCircle,
  Clock,
  User,
  ShoppingBag,
  Sparkles,
} from 'lucide-react';
import { Order, Recipe, Ingredient, AppSettings } from '../types';
import { formatCurrency, formatNumber } from '../utils/calculations';
import { formatDatePtBR } from '../utils/dateUtils';
import { calculateOrderCostAndProfit } from '../utils/orderMetrics';
import { downloadFinancialReportPdf } from '../utils/financialPdf';

interface DashboardReportsModalProps {
  isOpen: boolean;
  onClose: () => void;
  orders: Order[];
  recipes: Recipe[];
  ingredients: Ingredient[];
  cfg: AppSettings;
  initialPeriod?: 'dia' | 'semana' | 'mes' | 'total' | 'personalizado';
  initialStartDate?: string;
  initialEndDate?: string;
  onToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const DashboardReportsModal: React.FC<DashboardReportsModalProps> = ({
  isOpen,
  onClose,
  orders,
  recipes,
  ingredients,
  cfg,
  initialPeriod = 'mes',
  initialStartDate,
  initialEndDate,
  onToast,
}) => {
  const [reportType, setReportType] = useState<'sintetico' | 'analitico'>('sintetico');

  // Date filter range calculation
  const getPresetDates = (p: 'dia' | 'semana' | 'mes' | 'total' | 'personalizado') => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const todayStr = `${year}-${month}-${day}`;

    if (p === 'personalizado' && initialStartDate && initialEndDate) {
      return { start: initialStartDate, end: initialEndDate };
    }

    if (p === 'dia') {
      return { start: todayStr, end: todayStr };
    }

    if (p === 'semana') {
      const dayOfWeek = d.getDay();
      const distanceToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      const monday = new Date(d);
      monday.setDate(d.getDate() - distanceToMonday);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);

      const monStr = `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`;
      const sunStr = `${sunday.getFullYear()}-${String(sunday.getMonth() + 1).padStart(2, '0')}-${String(sunday.getDate()).padStart(2, '0')}`;
      return { start: monStr, end: sunStr };
    }

    if (p === 'mes') {
      const firstDay = `${year}-${month}-01`;
      const lastDayObj = new Date(year, d.getMonth() + 1, 0);
      const lastDay = `${year}-${month}-${String(lastDayObj.getDate()).padStart(2, '0')}`;
      return { start: firstDay, end: lastDay };
    }

    // total or fallback
    return { start: '2020-01-01', end: '2030-12-31' };
  };

  const initialDates = getPresetDates(initialPeriod);
  const [startDate, setStartDate] = useState<string>(initialDates.start);
  const [endDate, setEndDate] = useState<string>(initialDates.end);
  const [preset, setPreset] = useState<'dia' | 'semana' | 'mes' | 'total' | 'personalizado' | 'custom'>(initialPeriod);

  const handleApplyPreset = (p: 'dia' | 'semana' | 'mes' | 'total') => {
    setPreset(p);
    const { start, end } = getPresetDates(p);
    setStartDate(start);
    setEndDate(end);
  };

  // Filtered orders by date range
  const filteredOrders = useMemo(() => {
    const list = orders || [];
    return list.filter((o) => {
      const d = o.entrega || '';
      if (!d) return true;
      if (startDate && d < startDate) return false;
      if (endDate && d > endDate) return false;
      return true;
    });
  }, [orders, startDate, endDate]);

  // Synthetic report metrics
  const syntheticMetrics = useMemo(() => {
    let faturamento = 0;
    let recebidoCaixa = 0;
    let pendenteReceber = 0;
    let custoTotal = 0;
    let lucroTotal = 0;

    const statusCounts = { pendente: 0, pronto: 0, entregue: 0 };
    const statusValues = { pendente: 0, pronto: 0, entregue: 0 };

    for (const o of filteredOrders) {
      const val = o.valor || 0;
      const sin = o.sinal || 0;
      const restante = Math.max(0, val - sin);

      faturamento += val;
      const st = (o.status || 'pendente') as 'pendente' | 'pronto' | 'entregue';
      if (statusCounts[st] !== undefined) {
        statusCounts[st] = (statusCounts[st] || 0) + 1;
        statusValues[st] = (statusValues[st] || 0) + val;
      } else {
        statusCounts.pendente = (statusCounts.pendente || 0) + 1;
        statusValues.pendente = (statusValues.pendente || 0) + val;
      }

      if (o.pago) {
        recebidoCaixa += val;
      } else {
        recebidoCaixa += sin;
        pendenteReceber += restante;
      }

      const { cost, profit } = calculateOrderCostAndProfit(o, recipes, ingredients, cfg);
      custoTotal += cost;
      lucroTotal += profit;
    }

    const ticket = filteredOrders.length > 0 ? faturamento / filteredOrders.length : 0;
    const margem = faturamento > 0 ? (lucroTotal / faturamento) * 100 : cfg.margin || 60;

    return {
      totalOrders: filteredOrders.length,
      faturamento,
      recebidoCaixa,
      pendenteReceber,
      custoTotal,
      lucroTotal,
      ticketMedio: ticket,
      margem: Math.round(margem * 10) / 10,
      statusCounts,
      statusValues,
    };
  }, [filteredOrders, recipes, ingredients, cfg]);

  const handlePrint = () => {
    window.print();
  };

  const handleExportPdf = () => {
    try {
      downloadFinancialReportPdf({
        orders: filteredOrders,
        recipes,
        ingredients,
        cfg,
        storeName: 'Caseirinhos Fer&Dre',
      });
      if (onToast) onToast('Relatório financeiro em PDF exportado com sucesso!');
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
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-stone-900 dark:text-stone-100 font-display">
                Relatórios Financeiros do Dashboard
              </h2>
              <p className="text-[11px] text-stone-500 dark:text-stone-400">
                Gere relatórios sintéticos (resumo geral) e analíticos (detalhado por cliente e produto) com filtro de período.
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

        {/* Report Type & Date Filter Bar */}
        <div className="p-3 sm:px-6 bg-stone-100/70 dark:bg-stone-950/60 border-b border-stone-100 dark:border-stone-800 flex flex-wrap items-center justify-between gap-3 shrink-0 no-print">
          {/* Tabs: Sintético vs Analítico */}
          <div className="inline-flex rounded-xl bg-white dark:bg-stone-800 p-0.5 border border-stone-200 dark:border-stone-700 text-xs">
            <button
              onClick={() => setReportType('sintetico')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                reportType === 'sintetico'
                  ? 'bg-amber-600 text-white shadow-2xs'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
              }`}
            >
              Relatório Sintético (Resumo)
            </button>
            <button
              onClick={() => setReportType('analitico')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                reportType === 'analitico'
                  ? 'bg-amber-600 text-white shadow-2xs'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
              }`}
            >
              Relatório Analítico (Detalhado)
            </button>
          </div>

          {/* Date range filter */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <div className="flex items-center gap-1 bg-white dark:bg-stone-800 px-2.5 py-1 rounded-xl border border-stone-200 dark:border-stone-700">
              <span className="text-stone-400">De:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-transparent text-stone-900 dark:text-stone-100 font-semibold outline-none"
              />
            </div>

            <div className="flex items-center gap-1 bg-white dark:bg-stone-800 px-2.5 py-1 rounded-xl border border-stone-200 dark:border-stone-700">
              <span className="text-stone-400">Até:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-transparent text-stone-900 dark:text-stone-100 font-semibold outline-none"
              />
            </div>

            {/* Presets */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => handleApplyPreset('dia')}
                className={`px-2 py-1 rounded-lg font-medium text-[11px] cursor-pointer ${
                  preset === 'dia' ? 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200 font-bold' : 'text-stone-500 hover:bg-stone-200 dark:hover:bg-stone-800'
                }`}
              >
                Dia
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset('semana')}
                className={`px-2 py-1 rounded-lg font-medium text-[11px] cursor-pointer ${
                  preset === 'semana' ? 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200 font-bold' : 'text-stone-500 hover:bg-stone-200 dark:hover:bg-stone-800'
                }`}
              >
                Semana
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset('mes')}
                className={`px-2 py-1 rounded-lg font-medium text-[11px] cursor-pointer ${
                  preset === 'mes' ? 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200 font-bold' : 'text-stone-500 hover:bg-stone-200 dark:hover:bg-stone-800'
                }`}
              >
                Mês
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset('total')}
                className={`px-2 py-1 rounded-lg font-medium text-[11px] cursor-pointer ${
                  preset === 'total' ? 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200 font-bold' : 'text-stone-500 hover:bg-stone-200 dark:hover:bg-stone-800'
                }`}
              >
                Total
              </button>
            </div>
          </div>
        </div>

        {/* Printable Preview Sheet */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-stone-200/50 dark:bg-stone-950/80">
          <div className="max-w-3xl mx-auto bg-white text-stone-900 p-6 sm:p-8 rounded-2xl shadow-lg border border-stone-200 text-xs sm:text-sm printable-area">
            {/* Sheet Header */}
            <div className="border-b border-stone-200 pb-4 mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="text-[10px] uppercase tracking-wider font-extrabold text-amber-700 block">
                  Caseirinhos Fer&Dre · Gestão Financeira
                </span>
                <h1 className="text-lg sm:text-xl font-bold font-display text-stone-900">
                  {reportType === 'sintetico'
                    ? 'RELATÓRIO SINTÉTICO DE RESULTADOS'
                    : 'RELATÓRIO ANALÍTICO DETALHADO DE ENCOMENDAS'}
                </h1>
                <p className="text-xs text-stone-500 mt-0.5">
                  Período: <strong>{formatDatePtBR(startDate)}</strong> até <strong>{formatDatePtBR(endDate)}</strong> • {filteredOrders.length} encomenda(s)
                </p>
              </div>

              <div className="text-left sm:text-right text-xs text-stone-500">
                <p>Emissão: <strong>{new Date().toLocaleDateString('pt-BR')}</strong></p>
                <p>Horário: {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
              </div>
            </div>

            {/* SINTÉTICO REPORT BODY */}
            {reportType === 'sintetico' ? (
              <div className="space-y-5">
                {/* Executive KPIs Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl text-center">
                    <span className="text-[10px] font-bold text-stone-500 uppercase block">Qtd Encomendas</span>
                    <strong className="text-base font-extrabold text-stone-900 tabular-nums">{syntheticMetrics.totalOrders}</strong>
                  </div>

                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-center">
                    <span className="text-[10px] font-bold text-amber-800 uppercase block">Total Vendas (Bruto)</span>
                    <strong className="text-base font-extrabold text-amber-900 tabular-nums">{formatCurrency(syntheticMetrics.faturamento)}</strong>
                  </div>

                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-center">
                    <span className="text-[10px] font-bold text-emerald-800 uppercase block">Total Recebido (Caixa)</span>
                    <strong className="text-base font-extrabold text-emerald-900 tabular-nums">{formatCurrency(syntheticMetrics.recebidoCaixa)}</strong>
                  </div>

                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-center">
                    <span className="text-[10px] font-bold text-rose-800 uppercase block">Valores Pendentes</span>
                    <strong className="text-base font-extrabold text-rose-900 tabular-nums">{formatCurrency(syntheticMetrics.pendenteReceber)}</strong>
                  </div>
                </div>

                {/* Second tier KPIs */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl text-center">
                    <span className="text-[10px] font-bold text-stone-500 uppercase block">Custo Estimado</span>
                    <strong className="text-sm font-extrabold text-stone-900 tabular-nums">{formatCurrency(syntheticMetrics.custoTotal)}</strong>
                  </div>
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-center">
                    <span className="text-[10px] font-bold text-emerald-800 uppercase block">Lucro Líquido Estimado</span>
                    <strong className="text-sm font-extrabold text-emerald-900 tabular-nums">{formatCurrency(syntheticMetrics.lucroTotal)}</strong>
                  </div>
                  <div className="p-3 bg-sky-50 border border-sky-200 rounded-xl text-center">
                    <span className="text-[10px] font-bold text-sky-800 uppercase block">Margem Média Geral</span>
                    <strong className="text-sm font-extrabold text-sky-900 tabular-nums">{syntheticMetrics.margem}%</strong>
                  </div>
                </div>

                {/* Status Breakdown Table */}
                <div className="mt-4">
                  <h3 className="text-xs font-bold text-stone-800 uppercase tracking-wider mb-2">
                    Resumo de Encomendas por Status no Período
                  </h3>
                  <div className="border border-stone-200 rounded-xl overflow-hidden">
                    <table className="w-full text-left">
                      <thead className="bg-stone-100 text-stone-700 text-[11px] font-bold uppercase">
                        <tr>
                          <th className="py-2 px-3">Status da Encomenda</th>
                          <th className="py-2 px-3 text-center">Quantidade</th>
                          <th className="py-2 px-3 text-right">Faturamento Total</th>
                          <th className="py-2 px-3 text-right">% do Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100 text-xs">
                        <tr>
                          <td className="py-2 px-3 font-semibold text-amber-800">Pendentes (Em produção)</td>
                          <td className="py-2 px-3 text-center font-bold">{syntheticMetrics.statusCounts.pendente}</td>
                          <td className="py-2 px-3 text-right font-bold tabular-nums">{formatCurrency(syntheticMetrics.statusValues.pendente)}</td>
                          <td className="py-2 px-3 text-right tabular-nums">
                            {syntheticMetrics.faturamento > 0 ? Math.round((syntheticMetrics.statusValues.pendente / syntheticMetrics.faturamento) * 100) : 0}%
                          </td>
                        </tr>
                        <tr>
                          <td className="py-2 px-3 font-semibold text-sky-800">Prontas (Aguardando entrega)</td>
                          <td className="py-2 px-3 text-center font-bold">{syntheticMetrics.statusCounts.pronto}</td>
                          <td className="py-2 px-3 text-right font-bold tabular-nums">{formatCurrency(syntheticMetrics.statusValues.pronto)}</td>
                          <td className="py-2 px-3 text-right tabular-nums">
                            {syntheticMetrics.faturamento > 0 ? Math.round((syntheticMetrics.statusValues.pronto / syntheticMetrics.faturamento) * 100) : 0}%
                          </td>
                        </tr>
                        <tr>
                          <td className="py-2 px-3 font-semibold text-emerald-800">Entregues (Concluídas)</td>
                          <td className="py-2 px-3 text-center font-bold">{syntheticMetrics.statusCounts.entregue}</td>
                          <td className="py-2 px-3 text-right font-bold tabular-nums">{formatCurrency(syntheticMetrics.statusValues.entregue)}</td>
                          <td className="py-2 px-3 text-right tabular-nums">
                            {syntheticMetrics.faturamento > 0 ? Math.round((syntheticMetrics.statusValues.entregue / syntheticMetrics.faturamento) * 100) : 0}%
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : (
              /* ANALÍTICO REPORT BODY */
              <div className="space-y-4">
                <div className="text-xs text-stone-600 mb-2">
                  Detalhamento item por item das encomendas no período de {formatDatePtBR(startDate)} a {formatDatePtBR(endDate)}.
                </div>

                <div className="border border-stone-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-stone-100 border-b border-stone-200 text-stone-700 text-[11px] font-bold uppercase tracking-wider">
                        <th className="py-2.5 px-3">Data</th>
                        <th className="py-2.5 px-3">Cliente</th>
                        <th className="py-2.5 px-3">Produto / Bolo</th>
                        <th className="py-2.5 px-3">Tamanho</th>
                        <th className="py-2.5 px-3">Sabor</th>
                        <th className="py-2.5 px-3 text-center">Status</th>
                        <th className="py-2.5 px-3 text-right">Valor Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100 text-xs">
                      {filteredOrders.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-8 text-center text-stone-400">
                            Nenhuma encomenda encontrada no período selecionado.
                          </td>
                        </tr>
                      ) : (
                        filteredOrders.map((ord, oIdx) => {
                          const items = ord.itens && ord.itens.length > 0 ? ord.itens : [];

                          return items.map((it, iIdx) => (
                            <tr key={`${ord.id}-${iIdx}`} className={oIdx % 2 === 1 ? 'bg-stone-50/50' : 'bg-white'}>
                              {iIdx === 0 && (
                                <>
                                  <td rowSpan={items.length} className="py-2.5 px-3 font-semibold text-stone-900 align-top whitespace-nowrap border-r border-stone-100">
                                    {formatDatePtBR(ord.entrega)}
                                  </td>
                                  <td rowSpan={items.length} className="py-2.5 px-3 font-bold text-stone-900 align-top border-r border-stone-100">
                                    {ord.cliente}
                                  </td>
                                </>
                              )}

                              <td className="py-2 px-3 font-medium text-stone-900">
                                {it.qtd > 1 ? `${it.qtd}× ` : ''}{it.tipo}
                              </td>

                              <td className="py-2 px-3 font-bold text-amber-900">
                                {it.tamanho || 'Padrão'}
                              </td>

                              <td className="py-2 px-3 text-stone-700">
                                {it.sabor || '—'}
                              </td>

                              {iIdx === 0 && (
                                <>
                                  <td rowSpan={items.length} className="py-2.5 px-3 text-center align-top border-l border-stone-100 whitespace-nowrap">
                                    <span
                                      className={`inline-block text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase ${
                                        ord.status === 'entregue'
                                          ? 'bg-emerald-100 text-emerald-800'
                                          : ord.status === 'pronto'
                                          ? 'bg-sky-100 text-sky-800'
                                          : 'bg-amber-100 text-amber-900'
                                      }`}
                                    >
                                      {ord.status}
                                    </span>
                                  </td>
                                  <td rowSpan={items.length} className="py-2.5 px-3 text-right font-extrabold text-stone-900 align-top border-l border-stone-100 tabular-nums whitespace-nowrap">
                                    {formatCurrency(ord.valor || 0)}
                                  </td>
                                </>
                              )}
                            </tr>
                          ));
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Document Footer */}
            <div className="mt-6 pt-4 border-t border-stone-200 flex justify-between items-center text-[10px] text-stone-400">
              <span>Caseirinhos Fer&Dre — Relatório Financeiro ({reportType})</span>
              <span>Página 1 de 1</span>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:px-6 bg-stone-50 dark:bg-stone-900 border-t border-stone-100 dark:border-stone-800 flex flex-wrap items-center justify-between gap-3 shrink-0 no-print">
          <div className="text-xs text-stone-500">
            Filtro ativo: {filteredOrders.length} encomenda(s) encontradas.
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
