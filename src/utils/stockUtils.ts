import { Ingredient, Recipe, Unit } from '../types';
import { UNIT_FACTORS, formatNumber } from './calculations';

export interface IngredientStockStatus {
  ingredient: Ingredient;
  currentStock: number;
  minStock: number;
  deficit: number;
  status: 'zero' | 'low' | 'ok';
  maxBatchUsage: number;
  totalBatchUsage: number;
  recipesUsing: { recipeName: string; qtyInIngUnit: number }[];
}

/**
 * Converts quantity from recipe unit to ingredient unit
 */
export function convertQtyToIngUnit(qty: number, fromUnit: Unit, toUnit: Unit): number {
  const fromFactor = UNIT_FACTORS[fromUnit] || 1;
  const toFactor = UNIT_FACTORS[toUnit] || 1;
  return (qty * fromFactor) / toFactor;
}

/**
 * Computes stock status for a single ingredient based on its configuration and recipe usages.
 */
export function getIngredientStockStatus(
  ing: Ingredient,
  recipes: Recipe[]
): IngredientStockStatus {
  const currentStock = typeof ing.stock === 'number' ? ing.stock : 0;

  const recipesUsing: { recipeName: string; qtyInIngUnit: number }[] = [];

  for (const r of recipes) {
    const item = (r.items || []).find((it) => it.ing === ing.id);
    if (item && item.qty > 0) {
      const qtyInIngUnit = convertQtyToIngUnit(item.qty, item.unit, ing.unit);
      recipesUsing.push({
        recipeName: r.name,
        qtyInIngUnit,
      });
    }
  }

  const maxBatchUsage =
    recipesUsing.length > 0 ? Math.max(...recipesUsing.map((r) => r.qtyInIngUnit)) : 0;

  const totalBatchUsage = recipesUsing.reduce((acc, r) => acc + r.qtyInIngUnit, 0);

  // Minimum required stock:
  // If user explicitly configured minStock (> 0), use that.
  // Otherwise, default to maxBatchUsage (enough for at least 1 full batch of the most demanding recipe).
  // If not used in recipes, default to 1 package size (ing.size).
  let minStock = 0;
  if (typeof ing.minStock === 'number' && ing.minStock > 0) {
    minStock = ing.minStock;
  } else if (maxBatchUsage > 0) {
    minStock = maxBatchUsage;
  } else {
    minStock = ing.size > 0 ? ing.size : 1;
  }

  let status: 'zero' | 'low' | 'ok' = 'ok';
  if (currentStock <= 0) {
    status = 'zero';
  } else if (currentStock < minStock) {
    status = 'low';
  } else {
    status = 'ok';
  }

  const deficit = Math.max(0, minStock - currentStock);

  return {
    ingredient: ing,
    currentStock,
    minStock,
    deficit,
    status,
    maxBatchUsage,
    totalBatchUsage,
    recipesUsing,
  };
}

/**
 * Computes stock statuses for all ingredients.
 */
export function getAllIngredientsStockStatus(
  ingredients: Ingredient[],
  recipes: Recipe[]
): IngredientStockStatus[] {
  return ingredients.map((ing) => getIngredientStockStatus(ing, recipes));
}

/**
 * Generates formatted text report for low/zero stock items.
 */
export function generateLowStockReportText(
  ingredients: Ingredient[],
  recipes: Recipe[],
  storeName = 'Caseirinhos Fer&Dre'
): string {
  const statuses = getAllIngredientsStockStatus(ingredients, recipes);
  const zeroItems = statuses.filter((s) => s.status === 'zero');
  const lowItems = statuses.filter((s) => s.status === 'low');

  const now = new Date();
  const dateStr = now.toLocaleDateString('pt-BR');
  const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  if (zeroItems.length === 0 && lowItems.length === 0) {
    let text = `📋 *RESUMO DE ESTOQUE - ${storeName.toUpperCase()}*\n`;
    text += `📅 *Data:* ${dateStr} às ${timeStr}\n\n`;
    text += `✅ *Todos os ingredientes estão com estoque suficiente!*\n`;
    text += `Nenhum item zerado ou com estoque baixo baseado no uso em suas receitas cadastradas.\n\n`;
    text += `_Confeitaria em dia para produção!_`;
    return text;
  }

  let text = `📋 *RESUMO DE ESTOQUE BAIXO & FALTANTE*\n`;
  text += `🎂 *${storeName}*\n`;
  text += `📅 *Data:* ${dateStr} às ${timeStr}\n`;
  text += `------------------------------------\n\n`;

  if (zeroItems.length > 0) {
    text += `🚨 *ESTOQUE ZERADO (${zeroItems.length} ${zeroItems.length === 1 ? 'item' : 'itens'}):*\n`;
    zeroItems.forEach((item, idx) => {
      const u = item.ingredient.unit;
      text += `${idx + 1}. *${item.ingredient.name}*\n`;
      text += `   • Estoque atual: 0 ${u}\n`;
      text += `   • Mínimo recomendado: ${formatNumber(item.minStock, u === 'g' || u === 'ml' ? 0 : 2)} ${u}\n`;
      text += `   • Falta comprar: *${formatNumber(item.deficit, u === 'g' || u === 'ml' ? 0 : 2)} ${u}*\n`;
      if (item.recipesUsing.length > 0) {
        const recipeNames = item.recipesUsing.map((r) => r.recipeName).join(', ');
        text += `   ↳ Usado em: ${recipeNames}\n`;
      }
      text += `\n`;
    });
  }

  if (lowItems.length > 0) {
    text += `⚠️ *ESTOQUE BAIXO (${lowItems.length} ${lowItems.length === 1 ? 'item' : 'itens'}):*\n`;
    lowItems.forEach((item, idx) => {
      const u = item.ingredient.unit;
      text += `${idx + 1}. *${item.ingredient.name}*\n`;
      text += `   • Estoque atual: ${formatNumber(item.currentStock, u === 'g' || u === 'ml' ? 0 : 2)} ${u}\n`;
      text += `   • Mínimo recomendado: ${formatNumber(item.minStock, u === 'g' || u === 'ml' ? 0 : 2)} ${u}\n`;
      text += `   • Falta comprar: *${formatNumber(item.deficit, u === 'g' || u === 'ml' ? 0 : 2)} ${u}*\n`;
      if (item.recipesUsing.length > 0) {
        const recipeNames = item.recipesUsing.map((r) => r.recipeName).join(', ');
        text += `   ↳ Usado em: ${recipeNames}\n`;
      }
      text += `\n`;
    });
  }

  const totalToBuy = zeroItems.length + lowItems.length;
  text += `------------------------------------\n`;
  text += `🛒 *Total de itens para reposição:* ${totalToBuy} ingrediente(s)\n`;
  text += `_Gerado automaticamente pelo aplicativo ${storeName}_`;

  return text;
}
