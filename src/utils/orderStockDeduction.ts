import {
  Order,
  Recipe,
  Ingredient,
  PackagingItem,
  StockMovement,
  PackagingMovement,
  Unit,
} from '../types';
import { UNIT_FACTORS, formatNumber } from './calculations';
import { uid } from './storage';

export interface MissingStockItem {
  id: string;
  name: string;
  type: 'insumo' | 'embalagem';
  requiredQty: number;
  availableQty: number;
  missingQty: number;
  unit: string;
  formattedRequired: string;
  formattedAvailable: string;
  formattedMissing: string;
}

export interface IngredientRequirement {
  ingredient: Ingredient;
  requiredQty: number; // In ingredient's own unit
  unit: Unit;
}

export interface PackagingRequirement {
  packaging: PackagingItem;
  requiredQty: number; // In packaging's own unit
  unit: string;
}

export interface OrderStockRequirements {
  ingredientRequirements: IngredientRequirement[];
  packagingRequirements: PackagingRequirement[];
  missingItems: MissingStockItem[];
  isSufficient: boolean;
}

/**
 * Calculates total ingredient and packaging requirements for an order
 * and checks stock availability against current inventory.
 */
export function calculateOrderStockRequirements(
  order: Order,
  recipes: Recipe[],
  ingredients: Ingredient[],
  packagings: PackagingItem[]
): OrderStockRequirements {
  const ingNeedMap = new Map<string, { ingredient: Ingredient; requiredQty: number }>();
  const packNeedMap = new Map<string, { packaging: PackagingItem; requiredQty: number }>();

  for (const item of order.itens || []) {
    const qty = Math.max(item.qtd || 1, 1);

    // 1. Match recipe
    let rec = item.receitaId ? recipes.find((r) => r.id === item.receitaId) : undefined;
    if (!rec) {
      rec = recipes.find(
        (r) =>
          r.name.toLowerCase().trim() === (item.sabor || '').toLowerCase().trim() ||
          r.id === item.sabor
      );
    }

    if (!rec) continue;

    // 2. Match size
    const matchedSize =
      (rec.sizes || []).find(
        (s) => s.nome.toLowerCase() === (item.tamanho || '').toLowerCase()
      ) ||
      (rec.sizes || [])[0] || {
        id: 'default',
        nome: item.tamanho || 'Padrão',
        k: 1,
        pack: rec.pack || 0,
        sell: rec.sell || 0,
      };

    const k = matchedSize.k > 0 ? matchedSize.k : 1;
    const itemFactor = k * qty;

    // 3. Aggregate Ingredients
    for (const rItem of rec.items || []) {
      const ing = ingredients.find((i) => i.id === rItem.ing);
      if (!ing) continue;

      let effectiveUnit = rItem.unit;
      let effectiveQty = rItem.qty || 0;
      const isBanana = ing.name.toLowerCase().includes('banana');

      if (isBanana && effectiveUnit === 'un') {
        effectiveUnit = 'g';
        if (effectiveQty < 15) {
          effectiveQty = Math.round(effectiveQty * 120);
        }
      }

      // Convert recipe item qty to base unit (g, ml, un)
      const rItemFactor = UNIT_FACTORS[effectiveUnit] || 1;
      const requiredBaseQty = effectiveQty * itemFactor * rItemFactor;

      // Convert from base unit to ingredient's stock unit
      const ingStockFactor = UNIT_FACTORS[ing.unit] || 1;
      const requiredInIngUnit = requiredBaseQty / ingStockFactor;

      if (!ingNeedMap.has(ing.id)) {
        ingNeedMap.set(ing.id, { ingredient: ing, requiredQty: 0 });
      }

      ingNeedMap.get(ing.id)!.requiredQty += requiredInIngUnit;
    }

    // 4. Aggregate Packagings
    // a) Explicit size/recipe packaging links
    const links = matchedSize.packagings || rec.packagings || [];
    let linkedPackagingFound = false;

    for (const link of links) {
      const pack = packagings.find((p) => p.id === link.packagingId);
      if (!pack) continue;

      linkedPackagingFound = true;
      const reqQty = (link.qty || 1) * qty;

      if (!packNeedMap.has(pack.id)) {
        packNeedMap.set(pack.id, { packaging: pack, requiredQty: 0 });
      }

      packNeedMap.get(pack.id)!.requiredQty += reqQty;
    }

    // b) Automatic matching by cake size label if no explicit link
    if (!linkedPackagingFound && packagings.length > 0) {
      const sizeLabel = matchedSize.nome && matchedSize.nome.toLowerCase() !== 'default' ? matchedSize.nome : '';
      
      const matchedPack = packagings.find((p) => {
        if (p.category !== 'Caixas para Bolos') return false;
        if (!sizeLabel) return false;
        const pNameLower = p.name.toLowerCase();
        const dimLower = (p.dimension || '').toLowerCase();
        const szLower = sizeLabel.toLowerCase();
        return pNameLower.includes(szLower) || dimLower.includes(szLower);
      }) || packagings.find((p) => p.category === 'Caixas para Bolos');

      if (matchedPack) {
        const reqQty = 1 * qty;
        if (!packNeedMap.has(matchedPack.id)) {
          packNeedMap.set(matchedPack.id, { packaging: matchedPack, requiredQty: 0 });
        }
        packNeedMap.get(matchedPack.id)!.requiredQty += reqQty;
      }
    }
  }

  const ingredientRequirements: IngredientRequirement[] = Array.from(ingNeedMap.values()).map((v) => ({
    ingredient: v.ingredient,
    requiredQty: v.requiredQty,
    unit: v.ingredient.unit,
  }));

  const packagingRequirements: PackagingRequirement[] = Array.from(packNeedMap.values()).map((v) => ({
    packaging: v.packaging,
    requiredQty: v.requiredQty,
    unit: v.packaging.unit || 'un',
  }));

  const missingItems: MissingStockItem[] = [];

  // Check ingredient stocks
  for (const req of ingredientRequirements) {
    const available = typeof req.ingredient.stock === 'number' ? req.ingredient.stock : 0;
    if (available < req.requiredQty) {
      const missing = req.requiredQty - available;
      const dec = req.unit === 'g' || req.unit === 'ml' ? 0 : 2;
      missingItems.push({
        id: req.ingredient.id,
        name: req.ingredient.name,
        type: 'insumo',
        requiredQty: req.requiredQty,
        availableQty: available,
        missingQty: missing,
        unit: req.unit,
        formattedRequired: `${formatNumber(req.requiredQty, dec)} ${req.unit}`,
        formattedAvailable: `${formatNumber(available, dec)} ${req.unit}`,
        formattedMissing: `${formatNumber(missing, dec)} ${req.unit}`,
      });
    }
  }

  // Check packaging stocks
  for (const req of packagingRequirements) {
    const available = typeof req.packaging.stock === 'number' ? req.packaging.stock : 0;
    if (available < req.requiredQty) {
      const missing = req.requiredQty - available;
      missingItems.push({
        id: req.packaging.id,
        name: req.packaging.name,
        type: 'embalagem',
        requiredQty: req.requiredQty,
        availableQty: available,
        missingQty: missing,
        unit: req.unit,
        formattedRequired: `${formatNumber(req.requiredQty, 0)} ${req.unit}`,
        formattedAvailable: `${formatNumber(available, 0)} ${req.unit}`,
        formattedMissing: `${formatNumber(missing, 0)} ${req.unit}`,
      });
    }
  }

  return {
    ingredientRequirements,
    packagingRequirements,
    missingItems,
    isSufficient: missingItems.length === 0,
  };
}

export interface DeductionResult {
  updatedIngredients: Ingredient[];
  updatedPackagings: PackagingItem[];
  newStockMovements: StockMovement[];
  newPackagingMovements: PackagingMovement[];
  updatedOrder: Order;
}

/**
 * Executes automatic stock deduction for an order when marked as "Pronto".
 */
export function executeOrderStockDeduction(
  order: Order,
  recipes: Recipe[],
  ingredients: Ingredient[],
  packagings: PackagingItem[]
): DeductionResult {
  const reqs = calculateOrderStockRequirements(order, recipes, ingredients, packagings);

  const updatedIngredients = [...ingredients];
  const updatedPackagings = [...packagings];
  const newStockMovements: StockMovement[] = [];
  const newPackagingMovements: PackagingMovement[] = [];
  const now = Date.now();

  const itemNamesSummary = (order.itens || []).map((it) => `${it.qtd}x ${it.sabor || it.tipo}`).join(', ');

  // 1. Deduct Ingredients
  for (const req of reqs.ingredientRequirements) {
    const idx = updatedIngredients.findIndex((i) => i.id === req.ingredient.id);
    if (idx !== -1) {
      const cur = updatedIngredients[idx];
      const curStock = typeof cur.stock === 'number' ? cur.stock : 0;
      const newStock = Math.max(0, curStock - req.requiredQty);

      updatedIngredients[idx] = {
        ...cur,
        stock: newStock,
      };

      const mov: StockMovement = {
        id: uid(),
        ingredientId: cur.id,
        ingredientName: cur.name,
        type: 'saida',
        origin: 'Producao',
        qty: -req.requiredQty,
        unit: cur.unit,
        date: now,
        note: `Baixa produção encomenda de ${order.cliente} (${itemNamesSummary})`,
        shoppingItemId: order.id,
      };
      newStockMovements.push(mov);
    }
  }

  // 2. Deduct Packagings
  for (const req of reqs.packagingRequirements) {
    const idx = updatedPackagings.findIndex((p) => p.id === req.packaging.id);
    if (idx !== -1) {
      const cur = updatedPackagings[idx];
      const curStock = typeof cur.stock === 'number' ? cur.stock : 0;
      const newStock = Math.max(0, curStock - req.requiredQty);

      updatedPackagings[idx] = {
        ...cur,
        stock: newStock,
      };

      const mov: PackagingMovement = {
        id: uid(),
        packagingId: cur.id,
        packagingName: cur.name,
        type: 'saida',
        origin: 'Producao',
        qty: req.requiredQty,
        unit: cur.unit || 'un',
        date: now,
        reason: `Baixa produção encomenda - ${order.cliente}`,
        note: `Encomenda de ${order.cliente} (${itemNamesSummary})`,
        shoppingItemId: order.id,
      };
      newPackagingMovements.push(mov);
    }
  }

  const updatedOrder: Order = {
    ...order,
    status: 'pronto',
    stockDeducted: true,
    stockDeductedAt: now,
  };

  return {
    updatedIngredients,
    updatedPackagings,
    newStockMovements,
    newPackagingMovements,
    updatedOrder,
  };
}

/**
 * Reverts (estorno) stock deduction when an order is reopened (from "Pronto" back to "Pendente") or edited/deleted.
 */
export function executeOrderStockEstorno(
  order: Order,
  recipes: Recipe[],
  ingredients: Ingredient[],
  packagings: PackagingItem[]
): DeductionResult {
  const reqs = calculateOrderStockRequirements(order, recipes, ingredients, packagings);

  const updatedIngredients = [...ingredients];
  const updatedPackagings = [...packagings];
  const newStockMovements: StockMovement[] = [];
  const newPackagingMovements: PackagingMovement[] = [];
  const now = Date.now();

  const itemNamesSummary = (order.itens || []).map((it) => `${it.qtd}x ${it.sabor || it.tipo}`).join(', ');

  // 1. Estorno Ingredients
  for (const req of reqs.ingredientRequirements) {
    const idx = updatedIngredients.findIndex((i) => i.id === req.ingredient.id);
    if (idx !== -1) {
      const cur = updatedIngredients[idx];
      const curStock = typeof cur.stock === 'number' ? cur.stock : 0;
      const newStock = Math.max(0, curStock + req.requiredQty);

      updatedIngredients[idx] = {
        ...cur,
        stock: newStock,
      };

      const mov: StockMovement = {
        id: uid(),
        ingredientId: cur.id,
        ingredientName: cur.name,
        type: 'estorno',
        origin: 'Estorno Compra',
        qty: req.requiredQty,
        unit: cur.unit,
        date: now,
        note: `Estorno de baixa da encomenda de ${order.cliente} (${itemNamesSummary})`,
        shoppingItemId: order.id,
      };
      newStockMovements.push(mov);
    }
  }

  // 2. Estorno Packagings
  for (const req of reqs.packagingRequirements) {
    const idx = updatedPackagings.findIndex((p) => p.id === req.packaging.id);
    if (idx !== -1) {
      const cur = updatedPackagings[idx];
      const curStock = typeof cur.stock === 'number' ? cur.stock : 0;
      const newStock = Math.max(0, curStock + req.requiredQty);

      updatedPackagings[idx] = {
        ...cur,
        stock: newStock,
      };

      const mov: PackagingMovement = {
        id: uid(),
        packagingId: cur.id,
        packagingName: cur.name,
        type: 'estorno',
        origin: 'Estorno Compra',
        qty: -req.requiredQty,
        unit: cur.unit || 'un',
        date: now,
        reason: `Estorno de baixa - Encomenda reaberta`,
        note: `Estorno da encomenda de ${order.cliente} (${itemNamesSummary})`,
        shoppingItemId: order.id,
      };
      newPackagingMovements.push(mov);
    }
  }

  const updatedOrder: Order = {
    ...order,
    status: 'pendente',
    stockDeducted: false,
    stockDeductedAt: undefined,
  };

  return {
    updatedIngredients,
    updatedPackagings,
    newStockMovements,
    newPackagingMovements,
    updatedOrder,
  };
}
