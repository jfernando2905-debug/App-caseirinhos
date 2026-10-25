import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import {
  TrendingUp,
  DollarSign,
  PackageCheck,
  Percent,
  Calendar,
  Layers,
  ChevronDown,
  ChevronUp,
  Clock3,
  CheckCircle,
  Plus,
  PieChart as PieChartIcon,
  BarChart3,
  ArrowUpRight,
  Receipt,
  Sparkles,
  Wallet,
  Check,
  Clock,
  MessageCircle,
  Phone,
  AlertCircle,
  AlertTriangle,
} from 'lucide-react';
import { Order, Recipe, Ingredient, AppSettings } from '../types';
import { getMonthlyProfitHistory, calculateOrderCostAndProfit, MonthlyProfitData } from '../utils/orderMetrics';
import { formatCurrency, formatNumber } from '../utils/calculations';
import { formatPaymentReminderWhatsApp, formatDatePtBR, formatItemText } from '../utils/orderShare';

interface FinancialDashboardProps {
  orders: Order[];
  recipes: Recipe[];
  ingredients: Ingredient[];
  cfg: AppSettings;
  onNewOrder: () => void;
  onNavigateToOrders: () => void;
  onUpdatePayment?: (orderId: string, pago: boolean) => void;
  onToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

const STATUS_COLORS = {
  pendente: '#f59e0b', // amber
  pronto: '#0284c7',   // sky
  entregue: '#10b981', // emerald
};

export const FinancialDashboard: React.FC<FinancialDashboardProps> = ({
  orders,
  recipes,
  ingredients,
  cfg,
  onNewOrder,
  onNavigateToOrders,
  onUpdatePayment,
  onToast,
}) => {
  const [chartType, setChartType] = useState<'area' | 'bar'>('area');
  const [showMonthlyTable, setShowMonthlyTable] = useState<boolean>(true);
  const [receberFilter, setReceberFilter] = useState<'todas' | 'entregues' | 'abertas'>('todas');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // 1. Calculate overall financial metrics
  const {
    totalFaturamento,
    faturamentoEntregue,
    faturamentoEmAberto,
    totalCustoEstimado,
    lucroLiquidoEstimado,
    margemMediaGeral,
    ticketMedio,
    statusCounts,
    statusValues,
    totalAReceber,
    aReceberEntregues,
    aReceberAbertas,
    totalRecebidoCaixa,
    unpaidOrdersCount,
    unpaidEntreguesCount,
  } = useMemo(() => {
    let faturamento = 0;
    let fatEntregue = 0;
    let fatAberto = 0;
    let custoTotal = 0;
    let lucroTotal = 0;

    let totAReceber = 0;
    let recEntregues = 0;
    let recAbertas = 0;
    let totRecebidoCaixa = 0;
    let unpCount = 0;
    let unpEntregues = 0;

    const counts = { pendente: 0, pronto: 0, entregue: 0 };
    const values = { pendente: 0, pronto: 0, entregue: 0 };

    for (const order of orders) {
      const val = order.valor || 0;
      const sin = order.sinal || 0;
      const restante = Math.max(0, val - sin);

      faturamento += val;

      const st = order.status || 'pendente';
      counts[st] = (counts[st] || 0) + 1;
      values[st] = (values[st] || 0) + val;

      if (st === 'entregue') {
        fatEntregue += val;
      } else {
        fatAberto += val;
      }

      if (order.pago) {
        totRecebidoCaixa += val;
      } else {
        totRecebidoCaixa += sin;
        if (restante > 0) {
          totAReceber += restante;
          unpCount++;
          if (st === 'entregue') {
            recEntregues += restante;
            unpEntregues++;
          } else {
            recAbertas += restante;
          }
        }
      }

      const { cost, profit } = calculateOrderCostAndProfit(order, recipes, ingredients, cfg);
      custoTotal += cost;
      lucroTotal += profit;
    }

    const margem = faturamento > 0 ? (lucroTotal / faturamento) * 100 : cfg.margin || 60;
    const ticket = orders.length > 0 ? faturamento / orders.length : 0;

    return {
      totalFaturamento: faturamento,
      faturamentoEntregue: fatEntregue,
      faturamentoEmAberto: fatAberto,
      totalCustoEstimado: custoTotal,
      lucroLiquidoEstimado: lucroTotal,
      margemMediaGeral: Math.round(margem * 10) / 10,
      ticketMedio: ticket,
      statusCounts: counts,
      statusValues: values,
      totalAReceber: totAReceber,
      aReceberEntregues: recEntregues,
      aReceberAbertas: recAbertas,
      totalRecebidoCaixa: totRecebidoCaixa,
      unpaidOrdersCount: unpCount,
      unpaidEntreguesCount: unpEntregues,
    };
  }, [orders, recipes, ingredients, cfg]);

  // Unpaid orders list
  const unpaidOrders = useMemo(() => {
    return orders.filter((o) => {
      const val = o.valor || 0;
      const sin = o.sinal || 0;
      const restante = Math.max(0, val - sin);
      return !o.pago && val > 0 && restante > 0;
    });
  }, [orders]);

  const filteredUnpaidOrders = useMemo(() => {
    if (receberFilter === 'entregues') {
      return unpaidOrders.filter((o) => o.status === 'entregue');
    }
    if (receberFilter === 'abertas') {
      return unpaidOrders.filter((o) => o.status !== 'entregue');
    }
    return unpaidOrders;
  }, [unpaidOrders, receberFilter]);

  const handleBaixarPagamento = (order: Order) => {
    if (onUpdatePayment) {
      onUpdatePayment(order.id, true);
    }
  };

  const handleCobrarWhatsApp = (order: Order) => {
    const text = formatPaymentReminderWhatsApp(order);
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(order.id);
      setTimeout(() => setCopiedId(null), 3000);
      if (onToast) {
        onToast('Mensagem de lembrete de pagamento copiada! Cole no WhatsApp.');
      }
    });

    if (order.telefone) {
      const cleanPhone = order.telefone.replace(/\D/g, '');
      const fullPhone = cleanPhone.length <= 11 ? `55${cleanPhone}` : cleanPhone;
      window.open(`https://wa.me/${fullPhone}?text=${encodeURIComponent(text)}`, '_blank');
    }
  };

  // 2. Monthly historical series for Recharts
  const monthlyData: MonthlyProfitData[] = useMemo(() => {
    return getMonthlyProfitHistory(orders, recipes, ingredients, cfg);
  }, [orders, recipes, ingredients, cfg]);

  // 3. Orders by status data for Recharts PieChart
  const statusPieData = useMemo(() => {
    return [
      {
        name: 'Pendente',
        statusKey: 'pendente',
        value: statusCounts.pendente,
        totalValue: statusValues.pendente,
        color: STATUS_COLORS.pendente,
      },
      {
        name: 'Pronto',
        statusKey: 'pronto',
        value: statusCounts.pronto,
        totalValue: statusValues.pronto,
        color: STATUS_COLORS.pronto,
      },
      {
        name: 'Entregue',
        statusKey: 'entregue',
        value: statusCounts.entregue,
        totalValue: statusValues.entregue,
        color: STATUS_COLORS.entregue,
      },
    ].filter((item) => item.value > 0);
  }, [statusCounts, statusValues]);

  // Custom tooltip for financial curves
  const CustomFinanceTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const pData: MonthlyProfitData = payload[0].payload;
      return (
        <div className="bg-stone-900 text-stone-100 p-3 rounded-xl shadow-2xl text-xs space-y-2 border border-stone-800 min-w-[210px]">
          <p className="font-bold text-amber-300 text-sm border-b border-stone-800 pb-1 flex items-center justify-between">
            <span>Mês: {pData.monthLabel}</span>
            <span className="text-[10px] text-stone-400 font-normal">
              {pData.ordersCount} {pData.ordersCount === 1 ? 'pedido' : 'pedidos'}
            </span>
          </p>
          <div className="space-y-1.5 pt-0.5">
            <div className="flex justify-between items-center text-stone-300">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                <span>Faturamento:</span>
              </span>
              <strong className="text-white tabular-nums">{formatCurrency(pData.faturamento)}</strong>
            </div>
            <div className="flex justify-between items-center text-stone-400">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-400" />
                <span>Custos Estimados:</span>
              </span>
              <span className="tabular-nums">{formatCurrency(pData.custo)}</span>
            </div>
            <div className="flex justify-between items-center text-emerald-400 font-semibold pt-1 border-t border-stone-800">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span>Lucro Líquido:</span>
              </span>
              <strong className="tabular-nums">+{formatCurrency(pData.lucroMes)}</strong>
            </div>
            {chartType === 'area' && (
              <div className="flex justify-between items-center text-sky-400 text-[11px] pt-0.5">
                <span>Lucro Acumulado:</span>
                <span className="tabular-nums font-bold">{formatCurrency(pData.lucroAcumulado)}</span>
              </div>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  // Custom tooltip for status donut chart
  const CustomStatusTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-stone-900 text-stone-100 p-2.5 rounded-xl shadow-xl text-xs space-y-1 border border-stone-800">
          <p className="font-bold flex items-center gap-1.5" style={{ color: data.color }}>
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: data.color }} />
            <span>{data.name}</span>
          </p>
          <div className="flex justify-between gap-4 text-stone-300">
            <span>Quantidade:</span>
            <strong className="text-white tabular-nums">{data.value} {data.value === 1 ? 'pedido' : 'pedidos'}</strong>
          </div>
          <div className="flex justify-between gap-4 text-stone-300">
            <span>Valor Total:</span>
            <strong className="text-amber-400 tabular-nums">{formatCurrency(data.totalValue)}</strong>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-stone-900 dark:text-stone-100 font-display flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-amber-600 dark:text-amber-400" />
            <span>Dashboard Financeiro</span>
          </h2>
          <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-400 mt-0.5">
            Acompanhe o faturamento total, custos de produção, lucro estimado e status das encomendas.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onNavigateToOrders}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-stone-700 dark:text-stone-300 bg-white dark:bg-stone-900 hover:bg-stone-50 dark:hover:bg-stone-800 border border-stone-200 dark:border-stone-800 rounded-xl shadow-2xs transition-all active:scale-[0.98] min-h-[40px]"
          >
            <Calendar className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <span>Ver Encomendas</span>
          </button>
          <button
            onClick={onNewOrder}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-500 rounded-xl shadow-2xs transition-all active:scale-[0.98] min-h-[40px]"
          >
            <Plus className="w-4 h-4" />
            <span>Nova Encomenda</span>
          </button>
        </div>
      </div>

      {/* 5 Main Financial KPI Cards (including A Receber) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        {/* Card 1: Faturamento Total */}
        <div className="bg-white dark:bg-stone-900 border border-amber-200/70 dark:border-amber-900/40 rounded-2xl p-4 shadow-xs relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-stone-600 dark:text-stone-400">
              Faturamento Total
            </span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div>
            <b className="text-xl sm:text-2xl font-black text-amber-700 dark:text-amber-400 block font-display tabular-nums">
              {formatCurrency(totalFaturamento)}
            </b>
            <div className="text-[11px] text-stone-500 dark:text-stone-400 mt-1">
              <span className="text-emerald-700 dark:text-emerald-400 font-medium">
                {formatCurrency(totalRecebidoCaixa)} em caixa
              </span>
            </div>
          </div>
        </div>

        {/* Card 2: A Receber (NOVO) */}
        <div className="bg-white dark:bg-stone-900 border border-amber-300 dark:border-amber-700/80 rounded-2xl p-4 shadow-xs relative overflow-hidden flex flex-col justify-between bg-gradient-to-br from-white to-amber-50/30 dark:from-stone-900 dark:to-amber-950/20">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-amber-900 dark:text-amber-300">
              A Receber
            </span>
            <div className="w-7 h-7 rounded-lg bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-400 flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div>
            <b className="text-xl sm:text-2xl font-black text-amber-800 dark:text-amber-300 block font-display tabular-nums">
              {formatCurrency(totalAReceber)}
            </b>
            <div className="text-[11px] text-stone-500 dark:text-stone-400 mt-1">
              {aReceberEntregues > 0 ? (
                <span className="text-rose-600 dark:text-rose-400 font-semibold">
                  {formatCurrency(aReceberEntregues)} já entregues
                </span>
              ) : (
                <span>{unpaidOrdersCount} pedido(s) a receber</span>
              )}
            </div>
          </div>
        </div>

        {/* Card 3: Lucro Líquido Estimado */}
        <div className="bg-white dark:bg-stone-900 border border-emerald-200/70 dark:border-emerald-900/40 rounded-2xl p-4 shadow-xs relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-stone-600 dark:text-stone-400">
              Lucro Estimado
            </span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div>
            <b className="text-xl sm:text-2xl font-black text-emerald-700 dark:text-emerald-400 block font-display tabular-nums">
              {formatCurrency(lucroLiquidoEstimado)}
            </b>
            <div className="text-[11px] text-stone-500 dark:text-stone-400 mt-1 flex items-center gap-1.5">
              <span>Custos:</span>
              <strong className="text-stone-700 dark:text-stone-300 tabular-nums">
                {formatCurrency(totalCustoEstimado)}
              </strong>
            </div>
          </div>
        </div>

        {/* Card 4: Margem Média */}
        <div className="bg-white dark:bg-stone-900 border border-sky-200/70 dark:border-sky-900/40 rounded-2xl p-4 shadow-xs relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-stone-600 dark:text-stone-400">
              Margem Média
            </span>
            <div className="w-7 h-7 rounded-lg bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-400 flex items-center justify-center">
              <Percent className="w-4 h-4" />
            </div>
          </div>
          <div>
            <b className="text-xl sm:text-2xl font-black text-sky-700 dark:text-sky-400 block font-display tabular-nums">
              {margemMediaGeral}%
            </b>
            <div className="text-[11px] text-stone-500 dark:text-stone-400 mt-1">
              Ticket: <strong className="text-stone-700 dark:text-stone-300">{formatCurrency(ticketMedio)}</strong>
            </div>
          </div>
        </div>

        {/* Card 5: Total de Encomendas */}
        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-4 shadow-xs relative overflow-hidden flex flex-col justify-between col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-stone-600 dark:text-stone-400">
              Total Encomendas
            </span>
            <div className="w-7 h-7 rounded-lg bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 flex items-center justify-center">
              <PackageCheck className="w-4 h-4" />
            </div>
          </div>
          <div>
            <b className="text-xl sm:text-2xl font-black text-stone-900 dark:text-stone-100 block font-display tabular-nums">
              {orders.length}
            </b>
            <div className="flex items-center gap-1.5 mt-1 text-[11px]">
              <span className="text-emerald-700 dark:text-emerald-400 font-semibold">
                {statusCounts.entregue} entregues
              </span>
              <span>•</span>
              <span className="text-amber-700 dark:text-amber-400 font-semibold">
                {statusCounts.pendente} pend.
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Charts Section (2-Column Grid on larger screens) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (Span 2): Financial Evolution Chart */}
        <div className="lg:col-span-2 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-stone-100 dark:border-stone-800">
            <div>
              <h3 className="text-base font-bold text-stone-900 dark:text-stone-100 font-display flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span>Evolução Financeira Mensal</span>
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Faturamento e lucro líquido das encomendas entregues ao longo dos meses
              </p>
            </div>

            {/* Chart Mode Toggle */}
            <div className="flex items-center gap-1 p-1 bg-stone-100 dark:bg-stone-800 rounded-xl self-start sm:self-auto text-xs font-semibold">
              <button
                onClick={() => setChartType('area')}
                className={`px-3 py-1 rounded-lg transition-colors min-h-[30px] ${
                  chartType === 'area'
                    ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100 shadow-2xs'
                    : 'text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
                }`}
              >
                Curva de Lucro
              </button>
              <button
                onClick={() => setChartType('bar')}
                className={`px-3 py-1 rounded-lg transition-colors min-h-[30px] ${
                  chartType === 'bar'
                    ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100 shadow-2xs'
                    : 'text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
                }`}
              >
                Barras (Faturamento x Lucro)
              </button>
            </div>
          </div>

          {/* Recharts Container */}
          {monthlyData.length === 0 ? (
            <div className="py-14 text-center border border-dashed border-stone-200 dark:border-stone-800 rounded-xl">
              <Calendar className="w-10 h-10 text-stone-300 dark:text-stone-600 mx-auto mb-2" />
              <p className="text-sm font-bold text-stone-700 dark:text-stone-300">
                Nenhuma encomenda entregue registrada ainda
              </p>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 max-w-sm mx-auto">
                À medida que você marcar suas encomendas como <strong>Entregue</strong>, a curva mensal de faturamento e lucro aparecerá aqui automaticamente.
              </p>
            </div>
          ) : (
            <div className="w-full h-72 sm:h-80">
              <ResponsiveContainer width="100%" height="100%">
                {chartType === 'area' ? (
                  <AreaChart data={monthlyData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                    <defs>
                      <linearGradient id="dashFaturamentoGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#d97706" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#d97706" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="dashLucroGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#059669" stopOpacity={0.5} />
                        <stop offset="95%" stopColor="#059669" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#88888820" vertical={false} />
                    <XAxis
                      dataKey="monthLabel"
                      stroke="#88888880"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      stroke="#88888880"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(val) => `R$${val}`}
                    />
                    <Tooltip content={<CustomFinanceTooltip />} />
                    <Legend
                      verticalAlign="top"
                      height={36}
                      formatter={(val) => (
                        <span className="text-xs font-medium text-stone-700 dark:text-stone-300">
                          {val === 'faturamento' ? 'Faturamento Total' : 'Lucro Líquido'}
                        </span>
                      )}
                    />
                    <Area
                      type="monotone"
                      dataKey="faturamento"
                      stroke="#d97706"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#dashFaturamentoGrad)"
                    />
                    <Area
                      type="monotone"
                      dataKey="lucroMes"
                      stroke="#059669"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#dashLucroGrad)"
                    />
                  </AreaChart>
                ) : (
                  <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#88888820" vertical={false} />
                    <XAxis
                      dataKey="monthLabel"
                      stroke="#88888880"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      stroke="#88888880"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(val) => `R$${val}`}
                    />
                    <Tooltip content={<CustomFinanceTooltip />} />
                    <Legend
                      verticalAlign="top"
                      height={36}
                      formatter={(val) => (
                        <span className="text-xs font-medium text-stone-700 dark:text-stone-300">
                          {val === 'faturamento'
                            ? 'Faturamento'
                            : val === 'custo'
                            ? 'Custo de Produção'
                            : 'Lucro Líquido'}
                        </span>
                      )}
                    />
                    <Bar dataKey="faturamento" fill="#d97706" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="custo" fill="#e11d48" radius={[6, 6, 0, 0]} opacity={0.8} />
                    <Bar dataKey="lucroMes" fill="#059669" radius={[6, 6, 0, 0]} />
                  </BarChart>
                )}
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Right Column: Orders by Status Chart */}
        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4 flex flex-col justify-between">
          <div>
            <div className="pb-2 border-b border-stone-100 dark:border-stone-800">
              <h3 className="text-base font-bold text-stone-900 dark:text-stone-100 font-display flex items-center gap-2">
                <PieChartIcon className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span>Pedidos por Status</span>
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Distribuição de encomendas ativas e concluídas
              </p>
            </div>

            {orders.length === 0 ? (
              <div className="py-14 text-center">
                <Calendar className="w-10 h-10 text-stone-300 dark:text-stone-600 mx-auto mb-2" />
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  Nenhuma encomenda cadastrada
                </p>
              </div>
            ) : (
              <div className="w-full h-56 relative flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Tooltip content={<CustomStatusTooltip />} />
                    <Pie
                      data={statusPieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={78}
                      paddingAngle={4}
                    >
                      {statusPieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} stroke="transparent" />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                {/* Center Label inside donut */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-xl font-black text-stone-900 dark:text-stone-100 font-display">
                    {orders.length}
                  </span>
                  <span className="text-[10px] text-stone-500 font-medium uppercase tracking-wider">
                    Pedidos
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Status Breakdown Cards */}
          <div className="space-y-2 pt-2 border-t border-stone-100 dark:border-stone-800">
            {/* Pendente */}
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200/70 dark:border-amber-900/40 text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
                <span className="font-semibold text-stone-800 dark:text-stone-200">Pendentes</span>
              </div>
              <div className="text-right">
                <span className="font-bold text-amber-800 dark:text-amber-400 tabular-nums">
                  {statusCounts.pendente} ({formatCurrency(statusValues.pendente)})
                </span>
              </div>
            </div>

            {/* Pronto */}
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-sky-50/60 dark:bg-sky-950/30 border border-sky-200/70 dark:border-sky-900/40 text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-sky-500 shrink-0" />
                <span className="font-semibold text-stone-800 dark:text-stone-200">Prontos</span>
              </div>
              <div className="text-right">
                <span className="font-bold text-sky-800 dark:text-sky-400 tabular-nums">
                  {statusCounts.pronto} ({formatCurrency(statusValues.pronto)})
                </span>
              </div>
            </div>

            {/* Entregue */}
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/70 dark:border-emerald-900/40 text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                <span className="font-semibold text-stone-800 dark:text-stone-200">Entregues</span>
              </div>
              <div className="text-right">
                <span className="font-bold text-emerald-800 dark:text-emerald-400 tabular-nums">
                  {statusCounts.entregue} ({formatCurrency(statusValues.entregue)})
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Contas a Receber & Baixa de Pagamentos */}
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-100 dark:border-stone-800">
          <div>
            <h3 className="text-base font-bold text-stone-900 dark:text-stone-100 font-display flex items-center gap-2">
              <Wallet className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              <span>Contas a Receber & Baixa de Pagamentos</span>
            </h3>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              Gerencie recebimentos pendentes, envie lembretes por WhatsApp e dê baixa imediata.
            </p>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1 bg-stone-100 dark:bg-stone-800 p-1 rounded-xl text-xs font-semibold self-start sm:self-auto">
            <button
              onClick={() => setReceberFilter('todas')}
              className={`px-3 py-1.5 rounded-lg transition-colors min-h-[32px] ${
                receberFilter === 'todas'
                  ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100 shadow-2xs font-bold'
                  : 'text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
              }`}
            >
              Todas a Receber ({unpaidOrders.length})
            </button>
            <button
              onClick={() => setReceberFilter('entregues')}
              className={`px-3 py-1.5 rounded-lg transition-colors min-h-[32px] flex items-center gap-1.5 ${
                receberFilter === 'entregues'
                  ? 'bg-rose-600 text-white shadow-2xs font-bold'
                  : 'text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40'
              }`}
            >
              <span>Entregues a Cobrar</span>
              {unpaidEntreguesCount > 0 && (
                <span className="px-1.5 py-0.2 rounded bg-white/20 text-[10px] font-bold">
                  {unpaidEntreguesCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setReceberFilter('abertas')}
              className={`px-3 py-1.5 rounded-lg transition-colors min-h-[32px] ${
                receberFilter === 'abertas'
                  ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100 shadow-2xs font-bold'
                  : 'text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
              }`}
            >
              Encomendas Abertas ({unpaidOrders.length - unpaidEntreguesCount})
            </button>
          </div>
        </div>

        {/* Content */}
        {filteredUnpaidOrders.length === 0 ? (
          <div className="py-8 text-center bg-stone-50 dark:bg-stone-800/40 rounded-xl border border-dashed border-stone-200 dark:border-stone-800">
            <CheckCircle className="w-9 h-9 text-emerald-500 mx-auto mb-2" />
            <h4 className="text-sm font-bold text-stone-800 dark:text-stone-200">
              {unpaidOrders.length === 0
                ? 'Todos os pagamentos estão quitados!'
                : 'Nenhum pagamento pendente neste filtro.'}
            </h4>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 max-w-sm mx-auto">
              {unpaidOrders.length === 0
                ? 'Parabéns! Todas as encomendas registradas foram pagas pelos clientes.'
                : 'Alterne o filtro acima para ver as demais encomendas a receber.'}
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {filteredUnpaidOrders.map((order) => {
              const val = order.valor || 0;
              const sin = order.sinal || 0;
              const restante = Math.max(0, val - sin);
              const isEntregue = order.status === 'entregue';

              return (
                <div
                  key={order.id}
                  className={`p-3.5 sm:p-4 rounded-xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-3 ${
                    isEntregue
                      ? 'bg-rose-50/40 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/60'
                      : 'bg-white dark:bg-stone-800/60 border-stone-200 dark:border-stone-800'
                  }`}
                >
                  {/* Left: Info */}
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <strong className="text-sm font-bold text-stone-900 dark:text-stone-100">
                        {order.cliente}
                      </strong>

                      {/* Status Badge */}
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                          isEntregue
                            ? 'bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800'
                            : order.status === 'pronto'
                            ? 'bg-sky-100 dark:bg-sky-950/80 text-sky-800 dark:text-sky-300 border border-sky-300 dark:border-sky-800'
                            : 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                        }`}
                      >
                        {isEntregue ? 'Entregue (Aguardando Pagamento)' : order.status}
                      </span>
                    </div>

                    <div className="text-xs text-stone-500 dark:text-stone-400 flex items-center gap-3 flex-wrap">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {formatDatePtBR(order.entrega)} {order.hora ? `às ${order.hora}` : ''}
                      </span>
                      {order.telefone && (
                        <span className="flex items-center gap-1">
                          <Phone className="w-3.5 h-3.5" />
                          {order.telefone}
                        </span>
                      )}
                      <span>·</span>
                      <span className="truncate max-w-xs text-stone-600 dark:text-stone-300">
                        {order.itens.map((it) => `${it.qtd}× ${it.sabor || it.tipo}`).join(', ')}
                      </span>
                    </div>
                  </div>

                  {/* Right: Values and Direct Action Buttons */}
                  <div className="flex items-center justify-between md:justify-end gap-3 pt-2 md:pt-0 border-t md:border-t-0 border-stone-100 dark:border-stone-800">
                    <div className="text-left md:text-right pr-2">
                      <span className="text-[11px] text-stone-500 dark:text-stone-400 block">
                        A Receber:
                      </span>
                      <strong className="text-base sm:text-lg font-black text-amber-900 dark:text-amber-300 tabular-nums">
                        {formatCurrency(restante)}
                      </strong>
                      <span className="text-[10px] text-stone-500 dark:text-stone-400 block">
                        Total {formatCurrency(val)} {sin > 0 ? `(sinal ${formatCurrency(sin)})` : ''}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleCobrarWhatsApp(order)}
                        className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-800 rounded-xl transition-colors min-h-[38px]"
                        title="Enviar ou copiar lembrete de cobrança para WhatsApp"
                      >
                        <MessageCircle className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <span className="hidden sm:inline">
                          {copiedId === order.id ? 'Copiado!' : 'Cobrar WhatsApp'}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleBaixarPagamento(order)}
                        className="flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl shadow-xs transition-all active:scale-95 min-h-[38px]"
                        title="Confirmar recebimento do pagamento e dar baixa"
                      >
                        <Check className="w-4 h-4" />
                        <span>Dar Baixa</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Monthly Financial Breakdown Table */}
      {monthlyData.length > 0 && (
        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl overflow-hidden shadow-xs">
          <div
            onClick={() => setShowMonthlyTable(!showMonthlyTable)}
            className="p-4 sm:p-5 flex items-center justify-between cursor-pointer select-none bg-stone-50/60 dark:bg-stone-800/40 border-b border-stone-200 dark:border-stone-800"
          >
            <div className="flex items-center gap-2">
              <Receipt className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <h3 className="text-sm sm:text-base font-bold text-stone-900 dark:text-stone-100 font-display">
                Fechamento Detalhado por Mês ({monthlyData.length} meses)
              </h3>
            </div>
            <div className="flex items-center gap-2 text-stone-500 text-xs font-medium">
              <span>{showMonthlyTable ? 'Ocultar tabela' : 'Exibir tabela'}</span>
              {showMonthlyTable ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </div>
          </div>

          {showMonthlyTable && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-stone-100/70 dark:bg-stone-800/80 text-stone-600 dark:text-stone-300 border-b border-stone-200 dark:border-stone-800">
                  <tr>
                    <th className="py-3 px-4 font-semibold">Mês</th>
                    <th className="py-3 px-4 font-semibold text-center">Pedidos</th>
                    <th className="py-3 px-4 font-semibold text-right">Faturamento</th>
                    <th className="py-3 px-4 font-semibold text-right">Custos Estimados</th>
                    <th className="py-3 px-4 font-semibold text-right">Lucro Líquido</th>
                    <th className="py-3 px-4 font-semibold text-right">Margem %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                  {monthlyData.map((row) => {
                    const rowMargin =
                      row.faturamento > 0 ? Math.round((row.lucroMes / row.faturamento) * 1000) / 10 : 0;

                    return (
                      <tr key={row.monthKey} className="hover:bg-stone-50/70 dark:hover:bg-stone-800/50">
                        <td className="py-3 px-4 font-bold text-stone-900 dark:text-stone-100 font-display">
                          {row.monthLabel}
                        </td>
                        <td className="py-3 px-4 text-center tabular-nums font-medium text-stone-700 dark:text-stone-300">
                          {row.ordersCount}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-amber-700 dark:text-amber-400 tabular-nums">
                          {formatCurrency(row.faturamento)}
                        </td>
                        <td className="py-3 px-4 text-right text-stone-500 dark:text-stone-400 tabular-nums">
                          {formatCurrency(row.custo)}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">
                          +{formatCurrency(row.lucroMes)}
                        </td>
                        <td className="py-3 px-4 text-right font-semibold text-sky-700 dark:text-sky-400 tabular-nums">
                          {rowMargin}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
