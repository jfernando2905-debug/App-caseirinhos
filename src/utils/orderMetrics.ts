import { Order, Recipe, Ingredient, AppSettings } from '../types';
import { calculateSizeMetrics } from './calculations';

export interface MonthlyProfitData {
  monthKey: string; // '2026-07'
  monthLabel: string; // 'Jul/26'
  ordersCount: number;
  faturamento: number;
  custo: number;
  lucroMes: number;
  lucroAcumulado: number;
}

const MONTH_NAMES = [
  'Jan',
  'Fev',
  'Mar',
  'Abr',
  'Mai',
  'Jun',
  'Jul',
  'Ago',
  'Set',
  'Out',
  'Nov',
  'Dez',
];

/**
 * Calculates revenue, estimated total cost, and profit for a specific order.
 */
export function calculateOrderCostAndProfit(
  order: Order,
  recipes: Recipe[],
  ingredients: Ingredient[],
  cfg: AppSettings
): { cost: number; revenue: number; profit: number } {
  const revenue = order.valor || 0;
  const items = order.itens || [];

  if (items.length === 0) {
    // If no items, assume cost is based on standard target margin
    const estimatedCost = revenue * (1 - (cfg.margin || 60) / 100);
    return {
      revenue,
      cost: estimatedCost,
      profit: Math.max(0, revenue - estimatedCost),
    };
  }

  let totalItemCosts = 0;
  let hasLinkedRecipes = false;

  for (const item of items) {
    const qty = Math.max(1, item.qtd || 1);

    if (item.receitaId) {
      const rec = recipes.find((r) => r.id === item.receitaId);
      if (rec) {
        hasLinkedRecipes = true;
        // Try to match the size
        const matchedSize =
          (rec.sizes || []).find(
            (s) => s.nome.toLowerCase() === (item.tamanho || '').toLowerCase()
          ) ||
          (rec.sizes || [])[0] || {
            id: 'default',
            nome: 'Padrão',
            k: 1,
            pack: rec.pack || 0,
            sell: rec.sell || 0,
          };

        const metrics = calculateSizeMetrics(rec, matchedSize, cfg, ingredients);
        totalItemCosts += metrics.totalCost * qty;
        continue;
      }
    }

    // Unlinked item: estimate cost from item unit price or share of total revenue
    if (item.valorUnitario && item.valorUnitario > 0) {
      const itemCost = item.valorUnitario * (1 - (cfg.margin || 60) / 100);
      totalItemCosts += itemCost * qty;
    } else {
      const share = items.length > 0 ? revenue / items.length : 0;
      const itemCost = share * (1 - (cfg.margin || 60) / 100);
      totalItemCosts += itemCost;
    }
  }

  // If order.valor is specified, profit is revenue - cost.
  // Otherwise revenue is totalItemCosts / (1 - margin/100).
  const finalCost = Math.max(0, totalItemCosts);
  const finalRevenue = revenue > 0 ? revenue : finalCost / (1 - (cfg.margin || 60) / 100);
  const finalProfit = Math.max(0, finalRevenue - finalCost);

  return {
    revenue: finalRevenue,
    cost: finalCost,
    profit: finalProfit,
  };
}

/**
 * Computes monthly aggregated and accumulated profit for completed orders (status === 'entregue').
 */
export function getMonthlyProfitHistory(
  orders: Order[],
  recipes: Recipe[],
  ingredients: Ingredient[],
  cfg: AppSettings
): MonthlyProfitData[] {
  // Filter for completed/delivered orders
  const finishedOrders = orders.filter((o) => o.status === 'entregue');

  if (finishedOrders.length === 0) {
    return [];
  }

  // Group by 'YYYY-MM'
  const monthlyMap = new Map<
    string,
    {
      monthKey: string;
      ordersCount: number;
      faturamento: number;
      custo: number;
      lucroMes: number;
    }
  >();

  for (const order of finishedOrders) {
    // Extract date key
    let dateStr = order.entrega;
    if (!dateStr || dateStr.length < 7) {
      if (order.criadoEm) {
        dateStr = new Date(order.criadoEm).toISOString().slice(0, 10);
      } else {
        dateStr = new Date().toISOString().slice(0, 10);
      }
    }

    const monthKey = dateStr.slice(0, 7); // 'YYYY-MM'
    const { cost, revenue, profit } = calculateOrderCostAndProfit(
      order,
      recipes,
      ingredients,
      cfg
    );

    const existing = monthlyMap.get(monthKey) || {
      monthKey,
      ordersCount: 0,
      faturamento: 0,
      custo: 0,
      lucroMes: 0,
    };

    existing.ordersCount += 1;
    existing.faturamento += revenue;
    existing.custo += cost;
    existing.lucroMes += profit;

    monthlyMap.set(monthKey, existing);
  }

  // Sort chronologically
  const sortedKeys = Array.from(monthlyMap.keys()).sort();

  // Accumulate
  let accumulatedProfit = 0;
  const result: MonthlyProfitData[] = [];

  for (const key of sortedKeys) {
    const item = monthlyMap.get(key)!;
    accumulatedProfit += item.lucroMes;

    const [year, month] = key.split('-');
    const monthIndex = parseInt(month, 10) - 1;
    const shortYear = year.slice(2);
    const monthLabel = `${MONTH_NAMES[monthIndex] || month}/${shortYear}`;

    result.push({
      monthKey: key,
      monthLabel,
      ordersCount: item.ordersCount,
      faturamento: Math.round(item.faturamento * 100) / 100,
      custo: Math.round(item.custo * 100) / 100,
      lucroMes: Math.round(item.lucroMes * 100) / 100,
      lucroAcumulado: Math.round(accumulatedProfit * 100) / 100,
    });
  }

  return result;
}
