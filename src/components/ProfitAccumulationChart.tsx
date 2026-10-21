import React, { useState } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
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
} from 'lucide-react';
import { Order, Recipe, Ingredient, AppSettings } from '../types';
import { getMonthlyProfitHistory, MonthlyProfitData } from '../utils/orderMetrics';
import { formatCurrency, formatNumber } from '../utils/calculations';

interface ProfitAccumulationChartProps {
  orders: Order[];
  recipes: Recipe[];
  ingredients: Ingredient[];
  cfg: AppSettings;
}

export const ProfitAccumulationChart: React.FC<ProfitAccumulationChartProps> = ({
  orders,
  recipes,
  ingredients,
  cfg,
}) => {
  const [chartMode, setChartMode] = useState<'acumulado' | 'mensal'>('acumulado');
  const [showTable, setShowTable] = useState<boolean>(false);

  const data: MonthlyProfitData[] = getMonthlyProfitHistory(orders, recipes, ingredients, cfg);
  const deliveredOrders = orders.filter((o) => o.status === 'entregue');

  // Overall totals
  const totalLucro = data.length > 0 ? data[data.length - 1].lucroAcumulado : 0;
  const totalFaturamento = data.reduce((acc, cur) => acc + cur.faturamento, 0);
  const totalCusto = data.reduce((acc, cur) => acc + cur.custo, 0);
  const totalOrdersCount = deliveredOrders.length;
  const margemMedia =
    totalFaturamento > 0 ? Math.round(((totalFaturamento - totalCusto) / totalFaturamento) * 1000) / 10 : 0;

  // Custom tooltip for Recharts
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const pData: MonthlyProfitData = payload[0].payload;
      return (
        <div className="bg-stone-900 text-stone-100 p-3 rounded-xl shadow-xl text-xs space-y-1.5 border border-stone-800 min-w-[200px]">
          <p className="font-bold text-amber-300 text-sm border-b border-stone-800 pb-1 flex items-center justify-between">
            <span>Mês: {pData.monthLabel}</span>
            <span className="text-[10px] text-stone-400 font-normal">
              {pData.ordersCount} {pData.ordersCount === 1 ? 'encomenda' : 'encomendas'}
            </span>
          </p>
          <div className="space-y-1 pt-0.5">
            <div className="flex justify-between items-center text-stone-300">
              <span>Faturamento:</span>
              <strong className="text-white tabular-nums">{formatCurrency(pData.faturamento)}</strong>
            </div>
            <div className="flex justify-between items-center text-stone-400">
              <span>Custos de Produção:</span>
              <span className="tabular-nums">{formatCurrency(pData.custo)}</span>
            </div>
            <div className="flex justify-between items-center text-emerald-400 font-medium">
              <span>Lucro do Mês:</span>
              <strong className="tabular-nums">+{formatCurrency(pData.lucroMes)}</strong>
            </div>
            <div className="pt-1 border-t border-stone-800 flex justify-between items-center text-amber-400 font-bold">
              <span>Lucro Acumulado:</span>
              <strong className="tabular-nums text-sm">{formatCurrency(pData.lucroAcumulado)}</strong>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
      {/* Title & Description */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base font-bold text-stone-900 dark:text-stone-100 font-display">
              Lucro Total Acumulado por Mês
            </h3>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              Cálculo baseado nas {deliveredOrders.length} encomenda(s) finalizadas (status entregue)
            </p>
          </div>
        </div>

        {data.length > 0 && (
          <div className="flex items-center gap-1 p-1 bg-stone-100 dark:bg-stone-800 rounded-xl self-start sm:self-auto text-xs font-semibold">
            <button
              onClick={() => setChartMode('acumulado')}
              className={`px-3 py-1.5 rounded-lg transition-all min-h-[34px] ${
                chartMode === 'acumulado'
                  ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100 shadow-xs'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
              }`}
            >
              Lucro Acumulado
            </button>
            <button
              onClick={() => setChartMode('mensal')}
              className={`px-3 py-1.5 rounded-lg transition-all min-h-[34px] ${
                chartMode === 'mensal'
                  ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100 shadow-xs'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
              }`}
            >
              Mensal vs. Custo
            </button>
          </div>
        )}
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
        <div className="p-3 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/60">
          <span className="text-[11px] font-semibold text-emerald-800 dark:text-emerald-300 flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Lucro Acumulado</span>
          </span>
          <strong className="text-lg sm:text-xl font-bold text-emerald-950 dark:text-emerald-200 font-display block mt-1 tabular-nums">
            {formatCurrency(totalLucro)}
          </strong>
        </div>

        <div className="p-3 rounded-xl bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/60">
          <span className="text-[11px] font-semibold text-amber-800 dark:text-amber-300 flex items-center gap-1">
            <DollarSign className="w-3.5 h-3.5" />
            <span>Faturamento Total</span>
          </span>
          <strong className="text-lg sm:text-xl font-bold text-amber-950 dark:text-amber-200 font-display block mt-1 tabular-nums">
            {formatCurrency(totalFaturamento)}
          </strong>
        </div>

        <div className="p-3 rounded-xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700/80">
          <span className="text-[11px] font-semibold text-stone-600 dark:text-stone-400 flex items-center gap-1">
            <PackageCheck className="w-3.5 h-3.5" />
            <span>Entregas Feitas</span>
          </span>
          <strong className="text-lg sm:text-xl font-bold text-stone-900 dark:text-stone-100 font-display block mt-1 tabular-nums">
            {totalOrdersCount} {totalOrdersCount === 1 ? 'pedido' : 'pedidos'}
          </strong>
        </div>

        <div className="p-3 rounded-xl bg-sky-50/70 dark:bg-sky-950/40 border border-sky-200/80 dark:border-sky-800/60">
          <span className="text-[11px] font-semibold text-sky-800 dark:text-sky-300 flex items-center gap-1">
            <Percent className="w-3.5 h-3.5" />
            <span>Margem Média</span>
          </span>
          <strong className="text-lg sm:text-xl font-bold text-sky-950 dark:text-sky-200 font-display block mt-1 tabular-nums">
            {margemMedia}%
          </strong>
        </div>
      </div>

      {/* Chart Section */}
      {data.length === 0 ? (
        <div className="p-8 text-center bg-stone-50 dark:bg-stone-850 rounded-xl border border-dashed border-stone-200 dark:border-stone-800">
          <Calendar className="w-10 h-10 text-stone-300 dark:text-stone-600 mx-auto mb-2" />
          <h4 className="text-sm font-bold text-stone-700 dark:text-stone-300 font-display">
            Nenhuma encomenda finalizada ainda
          </h4>
          <p className="text-xs text-stone-500 dark:text-stone-400 max-w-sm mx-auto mt-1">
            Para visualizar a curva acumulada de lucros, marque suas encomendas como{' '}
            <strong className="text-emerald-700 dark:text-emerald-400">Entregue</strong> na aba Encomendas.
          </p>
        </div>
      ) : (
        <div className="pt-2">
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              {chartMode === 'acumulado' ? (
                <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="profitAccumulatedGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#059669" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#059669" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} opacity={0.3} />
                  <XAxis
                    dataKey="monthLabel"
                    tick={{ fontSize: 11, fill: '#78716c' }}
                    axisLine={{ stroke: '#e7e5e4' }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#78716c' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `R$${v}`}
                    width={60}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="lucroAcumulado"
                    name="Lucro Acumulado"
                    stroke="#059669"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#profitAccumulatedGrad)"
                    activeDot={{ r: 6, fill: '#059669', stroke: '#fff', strokeWidth: 2 }}
                  />
                </AreaChart>
              ) : (
                <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} opacity={0.3} />
                  <XAxis
                    dataKey="monthLabel"
                    tick={{ fontSize: 11, fill: '#78716c' }}
                    axisLine={{ stroke: '#e7e5e4' }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#78716c' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `R$${v}`}
                    width={60}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    verticalAlign="top"
                    align="right"
                    iconType="circle"
                    wrapperStyle={{ fontSize: '11px', paddingBottom: '8px' }}
                  />
                  <Bar
                    dataKey="faturamento"
                    name="Faturamento (R$)"
                    fill="#d97706"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="custo"
                    name="Custos (R$)"
                    fill="#78716c"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="lucroMes"
                    name="Lucro do Mês (R$)"
                    fill="#059669"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>

          {/* Toggle Monthly Data Table */}
          <div className="pt-3 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between">
            <button
              onClick={() => setShowTable(!showTable)}
              className="text-xs font-semibold text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 flex items-center gap-1.5 transition-colors"
            >
              <Layers className="w-3.5 h-3.5 text-stone-500 dark:text-stone-400" />
              <span>{showTable ? 'Ocultar tabela de dados' : 'Ver tabela detalhada por mês'}</span>
              {showTable ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            <span className="text-[11px] text-stone-500 dark:text-stone-400">
              Total acumulado: <strong className="text-emerald-700 dark:text-emerald-400">{formatCurrency(totalLucro)}</strong>
            </span>
          </div>

          {/* Collapsible Monthly Table */}
          {showTable && (
            <div className="mt-3 border border-stone-200 dark:border-stone-800 rounded-xl overflow-hidden text-xs">
              <table className="w-full text-left">
                <thead className="bg-stone-50 dark:bg-stone-800 border-b border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300">
                  <tr>
                    <th className="py-2 px-3 font-semibold">Mês</th>
                    <th className="py-2 px-3 font-semibold text-center">Pedidos</th>
                    <th className="py-2 px-3 font-semibold text-right">Faturamento</th>
                    <th className="py-2 px-3 font-semibold text-right">Custos</th>
                    <th className="py-2 px-3 font-semibold text-right">Lucro Mês</th>
                    <th className="py-2 px-3 font-semibold text-right text-emerald-800 dark:text-emerald-400">
                      Lucro Acumulado
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                  {data.map((row) => (
                    <tr key={row.monthKey} className="hover:bg-stone-50/60 dark:hover:bg-stone-800/40">
                      <td className="py-2 px-3 font-semibold text-stone-900 dark:text-stone-100">{row.monthLabel}</td>
                      <td className="py-2 px-3 text-center tabular-nums text-stone-600 dark:text-stone-400">
                        {row.ordersCount}
                      </td>
                      <td className="py-2 px-3 text-right tabular-nums text-stone-800 dark:text-stone-200">
                        {formatCurrency(row.faturamento)}
                      </td>
                      <td className="py-2 px-3 text-right tabular-nums text-stone-500 dark:text-stone-400">
                        {formatCurrency(row.custo)}
                      </td>
                      <td className="py-2 px-3 text-right tabular-nums font-semibold text-emerald-700 dark:text-emerald-400">
                        +{formatCurrency(row.lucroMes)}
                      </td>
                      <td className="py-2 px-3 text-right tabular-nums font-bold text-emerald-800 dark:text-emerald-300">
                        {formatCurrency(row.lucroAcumulado)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

