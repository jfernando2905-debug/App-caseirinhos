import { Ingredient, Recipe, RecipeItem, RecipeSize, AppSettings, Unit } from '../types';

export const UNIT_FACTORS: Record<Unit, number> = {
  g: 1,
  kg: 1000,
  ml: 1,
  L: 1000,
  un: 1,
};

export const UNIT_BASE: Record<Unit, 'g' | 'ml' | 'un'> = {
  g: 'g',
  kg: 'g',
  ml: 'ml',
  L: 'ml',
  un: 'un',
};

export const COMPATIBLE_UNITS: Record<'g' | 'ml' | 'un', Unit[]> = {
  g: ['g', 'kg'],
  ml: ['ml', 'L'],
  un: ['un'],
};

export function getCompatibleUnits(unit: Unit): Unit[] {
  const base = UNIT_BASE[unit] || 'g';
  return COMPATIBLE_UNITS[base] || [unit];
}

/**
 * Returns cost per base unit (per gram, per ml, or per single unit)
 */
export function getUnitPrice(ing?: Ingredient): number {
  if (!ing || !ing.price || ing.price <= 0 || !ing.size || ing.size <= 0) return 0;
  const factor = UNIT_FACTORS[ing.unit] || 1;
  const baseSize = ing.size * factor;
  return baseSize > 0 ? ing.price / baseSize : 0;
}

/**
 * Returns cost of a single recipe ingredient item
 */
export function getItemCost(item: RecipeItem, ings: Ingredient[]): number {
  const ing = ings.find((i) => i.id === item.ing);
  if (!ing) return 0;
  const factor = UNIT_FACTORS[item.unit] || 1;
  const qty = Math.max(item.qty || 0, 0);
  const baseQty = qty * factor;
  return getUnitPrice(ing) * baseQty;
}

/**
 * Returns user-friendly cost label (e.g., "R$ 5,50 / kg", "R$ 7,78 / L", "R$ 1,17 / un")
 */
export function getPerLabel(ing: Ingredient): string {
  const base = UNIT_BASE[ing.unit];
  const uPrice = getUnitPrice(ing);
  if (base === 'un') {
    return `${formatCurrency(uPrice)} / un`;
  }
  return `${formatCurrency(uPrice * 1000)} / ${base === 'g' ? 'kg' : 'L'}`;
}

/**
 * Analyzes oven temperature string and returns heat factor and label
 */
export function getHeatFactor(tempStr?: string): { m: number; label: string; avg: number | null } {
  if (!tempStr) return { m: 1.0, label: '', avg: null };
  const numbers = (String(tempStr).match(/\d+/g) || []).map(Number);
  if (!numbers.length) return { m: 1.0, label: '', avg: null };
  const avg = numbers.reduce((a, b) => a + b, 0) / numbers.length;
  if (avg < 160) return { m: 0.8, label: 'baixa', avg };
  if (avg <= 210) return { m: 1.0, label: 'média', avg };
  return { m: 1.25, label: 'alta', avg };
}

/**
 * Calculates gas cost for a recipe (base factor 1)
 */
export function calculateGasCost(recipe: Recipe, cfg: AppSettings): number {
  const gasKgPrice = (cfg.gasPrice || 0) / (cfg.gasKg > 0 ? cfg.gasKg : 13);
  const heat = getHeatFactor(recipe.temp);
  const timeHours = Math.max(recipe.time || 0, 0) / 60;
  const rate = Math.max(cfg.gasRate || 0, 0);
  return gasKgPrice * rate * heat.m * timeHours;
}

/**
 * Calculates electricity cost for a recipe (base factor 1)
 */
export function calculateElectricityCost(recipe: Recipe, cfg: AppSettings): number {
  const equip = recipe.equip || [];
  const tariff = Math.max(cfg.elecPrice || 0, 0);
  return equip.reduce((acc, eq) => {
    const w = Math.max(eq.w || 0, 0);
    const min = Math.max(eq.min || 0, 0);
    const kwh = (w / 1000) * (min / 60);
    return acc + kwh * tariff;
  }, 0);
}

export interface SizeCalculationResult {
  size: RecipeSize;
  k: number;
  ingrCost: number;
  gasCost: number;
  elecCost: number;
  fuelCost: number; // Other direct costs
  packCost: number; // Whole cake packaging
  totalCost: number;
  slices: number;
  costPerSlice: number;
  suggestedSlicePrice: number;
  suggestedCakePrice: number;
  sellCakePrice: number;
  sellSlicePrice: number;
  cakeProfit: number;
  sliceProfit: number;
  realMarginPercent: number;
  targetMarginPercent: number;
  costBreakdown: {
    label: string;
    value: number;
    percent: number;
    color: string;
  }[];
}

/**
 * Full calculation for a specific recipe size
 */
export function calculateSizeMetrics(
  recipe: Recipe,
  size: RecipeSize,
  cfg: AppSettings,
  ings: Ingredient[]
): SizeCalculationResult {
  const k = size.k > 0 ? size.k : 1;
  const items = recipe.items || [];
  const baseIngr = items.reduce((acc, it) => acc + getItemCost(it, ings), 0);
  const ingrCost = baseIngr * k;

  const baseGas = calculateGasCost(recipe, cfg);
  const gasCost = baseGas * k;

  const baseElec = calculateElectricityCost(recipe, cfg);
  const elecCost = baseElec * k;

  const fuelCost = Math.max(recipe.fuel || 0, 0) * k;
  const packCost = Math.max(size.pack || 0, 0); // whole cake package cost is fixed per cake size

  const totalCost = ingrCost + gasCost + elecCost + fuelCost + packCost;
  const baseYield = Math.max(recipe.yield || 1, 0.1);
  const slices = baseYield * k;
  const costPerSlice = slices > 0 ? totalCost / slices : totalCost;

  const targetMargin = Math.min(Math.max(recipe.margin || cfg.margin || 60, 0), 95);
  const marginDecimal = targetMargin / 100;

  // Selling price formula: Custo / (1 - Margem)
  const suggestedSlicePrice = costPerSlice / (1 - marginDecimal);
  const suggestedCakePrice = suggestedSlicePrice * slices;

  const sellCakePrice = Math.max(size.sell || 0, 0);
  const sellSlicePrice = slices > 0 && sellCakePrice > 0 ? sellCakePrice / slices : 0;

  const effectiveSellPrice = sellCakePrice > 0 ? sellCakePrice : suggestedCakePrice;
  const cakeProfit = effectiveSellPrice - totalCost;
  const sliceProfit = slices > 0 ? cakeProfit / slices : 0;
  const realMarginPercent = effectiveSellPrice > 0 ? (cakeProfit / effectiveSellPrice) * 100 : 0;

  // Breakdown percentages
  const safeTotal = totalCost > 0 ? totalCost : 1;
  const breakdown = [
    {
      label: 'Ingredientes',
      value: ingrCost,
      percent: (ingrCost / safeTotal) * 100,
      color: '#d97706', // amber-600
    },
    {
      label: 'Gás de Cozinha',
      value: gasCost,
      percent: (gasCost / safeTotal) * 100,
      color: '#ea580c', // orange-600
    },
    {
      label: 'Energia Elétrica',
      value: elecCost,
      percent: (elecCost / safeTotal) * 100,
      color: '#0284c7', // sky-600
    },
    {
      label: 'Embalagem',
      value: packCost,
      percent: (packCost / safeTotal) * 100,
      color: '#059669', // emerald-600
    },
    {
      label: 'Outros Custos',
      value: fuelCost,
      percent: (fuelCost / safeTotal) * 100,
      color: '#78716c', // stone-500
    },
  ].filter((item) => item.value > 0);

  return {
    size,
    k,
    ingrCost,
    gasCost,
    elecCost,
    fuelCost,
    packCost,
    totalCost,
    slices,
    costPerSlice,
    suggestedSlicePrice,
    suggestedCakePrice,
    sellCakePrice,
    sellSlicePrice,
    cakeProfit,
    sliceProfit,
    realMarginPercent,
    targetMarginPercent: targetMargin,
    costBreakdown: breakdown,
  };
}

/**
 * Batch scale calculation for multiple cakes
 */
export interface BatchScaleResult {
  recipe: Recipe;
  size: RecipeSize;
  cakeCount: number;
  totalFactor: number;
  totalSlices: number;
  totalCost: number;
  totalRevenue: number;
  totalProfit: number;
  ingredients: {
    ing: Ingredient | undefined;
    name: string;
    scaledQty: number;
    unit: Unit;
    cost: number;
  }[];
  gasCost: number;
  elecCost: number;
  packCost: number;
  fuelCost: number;
}

export function scaleBatch(
  recipe: Recipe,
  size: RecipeSize,
  cakeCount: number,
  cfg: AppSettings,
  ings: Ingredient[]
): BatchScaleResult {
  const count = Math.max(cakeCount || 1, 0.1);
  const k = size.k > 0 ? size.k : 1;
  const totalFactor = k * count;

  const ingredients = (recipe.items || []).map((item) => {
    const ing = ings.find((i) => i.id === item.ing);
    const rawQty = (item.qty || 0) * totalFactor;
    // Clean rounding to max 3 decimal places
    const scaledQty = Math.round(rawQty * 1000) / 1000;
    const factor = UNIT_FACTORS[item.unit] || 1;
    const cost = (getUnitPrice(ing) || 0) * scaledQty * factor;
    return {
      ing,
      name: ing?.name || 'Ingrediente não encontrado',
      scaledQty,
      unit: item.unit,
      cost,
    };
  });

  const ingrTotal = ingredients.reduce((sum, item) => sum + item.cost, 0);
  const gasCost = calculateGasCost(recipe, cfg) * totalFactor;
  const elecCost = calculateElectricityCost(recipe, cfg) * totalFactor;
  const packCost = Math.max(size.pack || 0, 0) * count;
  const fuelCost = Math.max(recipe.fuel || 0, 0) * totalFactor;
  const totalCost = ingrTotal + gasCost + elecCost + packCost + fuelCost;

  const totalSlices = Math.max(recipe.yield || 1, 0.1) * totalFactor;
  const unitSugPrice = (totalCost / (totalSlices || 1)) / (1 - (recipe.margin || cfg.margin || 60) / 100);
  const cakeSugPrice = unitSugPrice * (recipe.yield || 1) * k;

  const effectiveCakePrice = size.sell > 0 ? size.sell : cakeSugPrice;
  const totalRevenue = effectiveCakePrice * count;
  const totalProfit = totalRevenue - totalCost;

  return {
    recipe,
    size,
    cakeCount: count,
    totalFactor,
    totalSlices,
    totalCost,
    totalRevenue,
    totalProfit,
    ingredients,
    gasCost,
    elecCost,
    packCost,
    fuelCost,
  };
}

export function formatCurrency(num: number): string {
  const val = Number.isFinite(num) ? (Math.abs(num) < 0.0001 ? 0 : num) : 0;
  return val.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatNumber(num: number, maxDecimals: number = 2, minDecimals: number = 0): string {
  const val = Number.isFinite(num) ? (Math.abs(num) < 0.000001 ? 0 : num) : 0;
  const factor = Math.pow(10, maxDecimals);
  const rounded = Math.round(val * factor) / factor;
  return rounded.toLocaleString('pt-BR', {
    minimumFractionDigits: minDecimals,
    maximumFractionDigits: maxDecimals,
  });
}

export function formatPercent(num: number): string {
  const val = Number.isFinite(num) ? (Math.abs(num) < 0.0001 ? 0 : num) : 0;
  return `${formatNumber(val, 1, 1)}%`;
}
