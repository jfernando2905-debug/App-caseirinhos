import React, { useState, useMemo } from 'react';
import {
  Scale,
  Cake,
  ShoppingCart,
  CheckSquare,
  Square,
  Printer,
  Calendar,
  Share2,
  Check,
  AlertTriangle,
  ClipboardList,
  Layers,
  Sparkles,
  User,
  Package,
  Clock,
  Filter,
  Pencil,
  Plus,
  Minus,
  X,
  Save,
  History,
  CheckCircle2,
} from 'lucide-react';
import { Recipe, Ingredient, AppSettings, Order, Unit, PriceHistoryEntry } from '../types';
import {
  scaleBatch,
  formatCurrency,
  formatNumber,
  formatPercent,
  UNIT_FACTORS,
  UNIT_BASE,
  getUnitPrice,
  calculateGasCost,
  calculateElectricityCost,
} from '../utils/calculations';
import { NumericInput } from './NumericInput';
import { ProductionGridPreviewModal } from './ProductionGridPreviewModal';

interface BatchScalerProps {
  recipes: Recipe[];
  ingredients: Ingredient[];
  orders?: Order[];
  cfg: AppSettings;
  initialRecipeId?: string;
  onOpenRecipe: (recipe: Recipe) => void;
  onSaveIngredient?: (ingredient: Ingredient) => void;
  onUpdateRecipe?: (recipe: Recipe) => void;
  onUpdateStatus?: (orderId: string, newStatus: 'pendente' | 'pronto' | 'entregue') => void;
  onToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

type ScalerMode = 'manual' | 'orders' | 'shopping';

interface AggregatedIngredient {
  id: string;
  name: string;
  category: string;
  baseQty: number;
  baseUnit: 'g' | 'ml' | 'un';
  proportionalCost: number;
  packagesNeeded: number;
  packageCost: number;
  surplusBase: number;
  availableStockBaseQty?: number;
  deficitBaseQty?: number;
  ing?: Ingredient;
  usedIn: { recipeName: string; count: number }[];
  isCakePackaging?: boolean;
  cakeSizeName?: string;
  recipeIds?: string[];
}

interface AggregatedBakeItem {
  key: string;
  recipeId?: string;
  recipeName: string;
  sizeName: string;
  k: number;
  totalQty: number;
  orders: { client: string; qty: number; orderId: string; entrega: string }[];
  recipeFound: boolean;
}

export const BatchScaler: React.FC<BatchScalerProps> = ({
  recipes,
  ingredients,
  orders = [],
  cfg,
  initialRecipeId,
  onSaveIngredient,
  onUpdateRecipe,
  onUpdateStatus,
  onToast,
}) => {
  // Mode switcher
  const [mode, setMode] = useState<ScalerMode>('orders');

  // Manual mode state
  const [selectedRecipeId, setSelectedRecipeId] = useState<string>(
    initialRecipeId || (recipes[0] ? recipes[0].id : '')
  );
  const [selectedSizeIndex, setSelectedSizeIndex] = useState<number>(0);
  const [cakeCount, setCakeCount] = useState<number>(3);
  const [checkedIngredients, setCheckedIngredients] = useState<Record<number, boolean>>({});

  // Orders mode state
  const [statusFilter, setStatusFilter] = useState<'all_open' | 'pendente' | 'pronto'>('all_open');
  const [selectedOrderIds, setSelectedOrderIds] = useState<Record<string, boolean>>({});
  const [checkedWeighing, setCheckedWeighing] = useState<Record<string, boolean>>({});

  // Shopping list state
  const [shoppingSource, setShoppingSource] = useState<'orders' | 'manual'>('orders');
  const [purchasedIngredients, setPurchasedIngredients] = useState<Record<string, boolean>>({});
  const [copiedToast, setCopiedToast] = useState<boolean>(false);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [onlyShowDeficit, setOnlyShowDeficit] = useState<boolean>(true);
  const [isPreviewGridOpen, setIsPreviewGridOpen] = useState<boolean>(false);

  // Shopping list customization & editing state
  const [customPackageCounts, setCustomPackageCounts] = useState<Record<string, number>>({});
  const [editingItem, setEditingItem] = useState<AggregatedIngredient | null>(null);
  const [editPrice, setEditPrice] = useState<number>(0);
  const [editSize, setEditSize] = useState<number>(0);
  const [editUnit, setEditUnit] = useState<Unit>('g');
  const [editPackagesCount, setEditPackagesCount] = useState<number>(1);
  const [editSuccessMsg, setEditSuccessMsg] = useState<string>('');

  // Open orders list (not delivered)
  const openOrders = useMemo(() => {
    return orders.filter((o) => o.status !== 'entregue');
  }, [orders]);

  // Filtered open orders based on sub-status
  const filteredOpenOrders = useMemo(() => {
    if (statusFilter === 'all_open') return openOrders;
    return openOrders.filter((o) => o.status === statusFilter);
  }, [openOrders, statusFilter]);

  // Initialize selectedOrderIds when openOrders change if empty
  const activeOrderSelection = useMemo(() => {
    const map: Record<string, boolean> = {};
    for (const ord of filteredOpenOrders) {
      if (selectedOrderIds[ord.id] !== undefined) {
        map[ord.id] = selectedOrderIds[ord.id];
      } else {
        map[ord.id] = true; // default selected
      }
    }
    return map;
  }, [filteredOpenOrders, selectedOrderIds]);

  const selectedOrdersCount = useMemo(() => {
    return filteredOpenOrders.filter((o) => activeOrderSelection[o.id] !== false).length;
  }, [filteredOpenOrders, activeOrderSelection]);

  // Toggle single order selection
  const toggleOrderSelection = (orderId: string) => {
    setSelectedOrderIds((prev) => ({
      ...prev,
      [orderId]: prev[orderId] === undefined ? false : !prev[orderId],
    }));
  };

  // Select / Deselect all orders
  const handleSelectAllOrders = (select: boolean) => {
    const updated: Record<string, boolean> = {};
    for (const ord of filteredOpenOrders) {
      updated[ord.id] = select;
    }
    setSelectedOrderIds(updated);
  };

  // Current recipe for manual mode
  const currentRecipe = recipes.find((r) => r.id === selectedRecipeId) || recipes[0];
  const sizes =
    currentRecipe?.sizes && currentRecipe.sizes.length > 0
      ? currentRecipe.sizes
      : [
          {
            id: 'default',
            nome: 'Padrão',
            k: 1,
            pack: currentRecipe?.pack || 0,
            sell: currentRecipe?.sell || 0,
          },
        ];

  const currentSizeIndex = Math.min(selectedSizeIndex, (sizes?.length || 1) - 1);
  const selectedSize = sizes[currentSizeIndex] || sizes[0];
  const safeCakeCount = Math.max(cakeCount || 1, 0.1);

  const manualBatchResult = useMemo(() => {
    if (!currentRecipe) return null;
    return scaleBatch(currentRecipe, selectedSize, safeCakeCount, cfg, ingredients);
  }, [currentRecipe, selectedSize, safeCakeCount, cfg, ingredients]);

  // ==========================================
  // AGGREGATION LOGIC FOR OPEN ORDERS
  // ==========================================
  const {
    bakeItems,
    unlinkedItems,
    aggregatedIngredients,
    ordersFinancials,
  } = useMemo(() => {
    const selectedOrders = filteredOpenOrders.filter((o) => activeOrderSelection[o.id] !== false);

    const bakeMap = new Map<string, AggregatedBakeItem>();
    const unlinked: { client: string; itemName: string; orderId: string }[] = [];
    const ingrMap = new Map<
      string,
      {
        name: string;
        category: string;
        baseQty: number;
        baseUnit: 'g' | 'ml' | 'un';
        ing?: Ingredient;
        usedIn: Map<string, number>;
      }
    >();

    const packMap = new Map<
      string,
      {
        id: string;
        name: string;
        sizeName: string;
        totalQty: number;
        unitPrice: number;
        recipeNames: Map<string, number>;
        recipeIds: Set<string>;
      }
    >();

    let totalRevenue = 0;
    let totalGasCost = 0;
    let totalElecCost = 0;
    let totalPackCost = 0;
    let totalFuelCost = 0;

    for (const order of selectedOrders) {
      totalRevenue += order.valor || 0;

      for (const item of order.itens || []) {
        const qty = Math.max(item.qtd || 1, 1);

        // Find matching recipe
        let rec = item.receitaId ? recipes.find((r) => r.id === item.receitaId) : undefined;
        if (!rec) {
          rec = recipes.find(
            (r) =>
              r.name.toLowerCase().trim() === (item.sabor || '').toLowerCase().trim() ||
              r.id === item.sabor
          );
        }

        if (!rec) {
          unlinked.push({
            client: order.cliente,
            itemName: `${item.qtd}× ${item.sabor || item.tipo} (${item.tamanho || 'Tamanho não especificado'})`,
            orderId: order.id,
          });
          continue;
        }

        // Match size
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
        const bakeKey = `${rec.id}__${matchedSize.nome}`;

        if (!bakeMap.has(bakeKey)) {
          bakeMap.set(bakeKey, {
            key: bakeKey,
            recipeId: rec.id,
            recipeName: rec.name,
            sizeName: matchedSize.nome,
            k,
            totalQty: 0,
            orders: [],
            recipeFound: true,
          });
        }

        const bakeGroup = bakeMap.get(bakeKey)!;
        bakeGroup.totalQty += qty;
        bakeGroup.orders.push({
          client: order.cliente,
          qty,
          orderId: order.id,
          entrega: order.entrega,
        });

        // Add utilities
        const itemFactor = k * qty;
        totalGasCost += calculateGasCost(rec, cfg) * itemFactor;
        totalElecCost += calculateElectricityCost(rec, cfg) * itemFactor;
        const unitPackCost = Math.max(matchedSize.pack || rec.pack || 0, 0);
        totalPackCost += unitPackCost * qty;
        totalFuelCost += Math.max(rec.fuel || 0, 0) * itemFactor;

        // Aggregate cake packaging for shopping list
        const sizeLabel = matchedSize.nome && matchedSize.nome.toLowerCase() !== 'default' ? matchedSize.nome : 'Padrão';
        const packKey = `${sizeLabel}__${unitPackCost}`;
        const packId = `pack-cake-${sizeLabel.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${unitPackCost.toFixed(2).replace('.', '_')}`;
        const packName = sizeLabel !== 'Padrão'
          ? `Embalagem para Bolo (Tamanho ${sizeLabel})`
          : `Embalagem para Bolo (${rec.name})`;

        if (!packMap.has(packKey)) {
          packMap.set(packKey, {
            id: packId,
            name: packName,
            sizeName: sizeLabel,
            totalQty: 0,
            unitPrice: unitPackCost,
            recipeNames: new Map<string, number>(),
            recipeIds: new Set<string>(),
          });
        }

        const packEntry = packMap.get(packKey)!;
        packEntry.totalQty += qty;
        packEntry.recipeIds.add(rec.id);
        const currentRecipeCount = packEntry.recipeNames.get(rec.name) || 0;
        packEntry.recipeNames.set(rec.name, currentRecipeCount + qty);

        // Aggregate ingredients
        for (const rItem of rec.items || []) {
          const ing = ingredients.find((i) => i.id === rItem.ing);
          const ingId = rItem.ing || (ing ? ing.id : `unknown-${rItem.ing}`);
          const ingName = ing ? ing.name : 'Ingrediente Desconhecido';
          const ingCategory = ing?.category || 'Geral';

          // Safeguard: Banana in confectionery is weighed in grams (g / kg), never large quantities of 'un'
          let effectiveUnit = rItem.unit;
          let effectiveQty = rItem.qty || 0;
          const isBanana = ingName.toLowerCase().includes('banana') || (ing && ing.name.toLowerCase().includes('banana'));
          if (isBanana && effectiveUnit === 'un') {
            effectiveUnit = 'g';
            if (effectiveQty < 15) {
              effectiveQty = Math.round(effectiveQty * 120);
            }
          }

          const unitFactor = UNIT_FACTORS[effectiveUnit] || 1;
          const baseUnit = UNIT_BASE[effectiveUnit] || 'g';
          const addedBaseQty = effectiveQty * itemFactor * unitFactor;

          if (!ingrMap.has(ingId)) {
            ingrMap.set(ingId, {
              name: ingName,
              category: ingCategory,
              baseQty: 0,
              baseUnit,
              ing,
              usedIn: new Map<string, number>(),
            });
          }

          const existing = ingrMap.get(ingId)!;
          existing.baseQty += addedBaseQty;
          const currentCount = existing.usedIn.get(rec.name) || 0;
          existing.usedIn.set(rec.name, currentCount + qty);
        }
      }
    }

    // Convert aggregated ingredients to final array with packaging & cost calculation
    const aggregatedIngsList: AggregatedIngredient[] = Array.from(ingrMap.entries()).map(
      ([id, data]) => {
        const uPrice = getUnitPrice(data.ing);
        const proportionalCost = uPrice * data.baseQty;

        // Abater estoque disponível
        const stockUnit = data.ing?.unit || data.baseUnit;
        const stockFactor = UNIT_FACTORS[stockUnit] || 1;
        const availableStockBaseQty = Math.max(0, (data.ing?.stock || 0) * stockFactor);
        const deficitBaseQty = Math.max(0, data.baseQty - availableStockBaseQty);

        // Commercial packages needed (based on deficit)
        let defaultPackagesNeeded = 0;
        let packageCost = 0;
        let surplusBase = 0;

        if (data.ing && data.ing.size > 0) {
          const packFactor = UNIT_FACTORS[data.ing.unit] || 1;
          const packBaseSize = data.ing.size * packFactor;
          if (packBaseSize > 0) {
            defaultPackagesNeeded = deficitBaseQty > 0 ? Math.ceil(deficitBaseQty / packBaseSize) : 0;
          }
        } else if (deficitBaseQty > 0) {
          defaultPackagesNeeded = 1;
        }

        const packagesNeeded =
          customPackageCounts[id] !== undefined
            ? customPackageCounts[id]
            : defaultPackagesNeeded;

        if (data.ing && data.ing.size > 0) {
          const packFactor = UNIT_FACTORS[data.ing.unit] || 1;
          const packBaseSize = data.ing.size * packFactor;
          packageCost = packagesNeeded * (data.ing.price || 0);
          surplusBase = Math.max(0, (availableStockBaseQty + packagesNeeded * packBaseSize) - data.baseQty);
        } else {
          packageCost = deficitBaseQty > 0 ? uPrice * deficitBaseQty : 0;
        }

        const usedInArray = Array.from(data.usedIn.entries()).map(([recipeName, count]) => ({
          recipeName,
          count,
        }));

        return {
          id,
          name: data.name,
          category: data.category,
          baseQty: data.baseQty,
          baseUnit: data.baseUnit,
          proportionalCost,
          packagesNeeded,
          packageCost,
          surplusBase,
          availableStockBaseQty,
          deficitBaseQty,
          ing: data.ing,
          usedIn: usedInArray,
        };
      }
    );

    // Convert aggregated cake packaging into shopping list items
    const packAggregatedList: AggregatedIngredient[] = Array.from(packMap.values()).map(
      (packData) => {
        const matchedIng = ingredients.find(
          (i) =>
            i.id === packData.id ||
            (i.category === 'Embalagens' &&
              (i.name.toLowerCase() === packData.name.toLowerCase() ||
                i.name.toLowerCase().includes(packData.sizeName.toLowerCase())))
        );

        const syntheticIng: Ingredient = matchedIng || {
          id: packData.id,
          name: packData.name,
          price: packData.unitPrice,
          size: 1,
          unit: 'un',
          category: 'Embalagens',
          hist: [],
        };

        const baseQty = packData.totalQty;
        const packSize = syntheticIng.size > 0 ? syntheticIng.size : 1;
        const stockUnit = syntheticIng.unit || 'un';
        const stockFactor = UNIT_FACTORS[stockUnit] || 1;
        const availableStockBaseQty = Math.max(0, (syntheticIng.stock || 0) * stockFactor);
        const deficitBaseQty = Math.max(0, baseQty - availableStockBaseQty);

        const defaultPackagesNeeded = deficitBaseQty > 0 ? Math.ceil(deficitBaseQty / packSize) : 0;
        const packagesNeeded =
          customPackageCounts[packData.id] !== undefined
            ? customPackageCounts[packData.id]
            : defaultPackagesNeeded;

        const uPrice = syntheticIng.price !== undefined ? syntheticIng.price : packData.unitPrice;
        const proportionalCost = baseQty * (uPrice / packSize);
        const packageCost = packagesNeeded * uPrice;
        const surplusBase = Math.max(0, (availableStockBaseQty + packagesNeeded * packSize) - baseQty);

        const usedInArray = Array.from(packData.recipeNames.entries()).map(([recipeName, count]) => ({
          recipeName,
          count,
        }));

        return {
          id: packData.id,
          name: packData.name,
          category: 'Embalagens',
          baseQty,
          baseUnit: 'un' as const,
          proportionalCost,
          packagesNeeded,
          packageCost,
          surplusBase,
          availableStockBaseQty,
          deficitBaseQty,
          ing: syntheticIng,
          usedIn: usedInArray,
          isCakePackaging: true,
          cakeSizeName: packData.sizeName,
          recipeIds: Array.from(packData.recipeIds),
        };
      }
    );

    aggregatedIngsList.push(...packAggregatedList);

    // Sort by category then name
    aggregatedIngsList.sort((a, b) => {
      if (a.category !== b.category) {
        return (a.category || '').localeCompare(b.category || '');
      }
      return a.name.localeCompare(b.name);
    });

    const totalIngCost = aggregatedIngsList
      .filter((i) => !i.isCakePackaging)
      .reduce((sum, i) => sum + i.proportionalCost, 0);
    const totalCommercialCost = aggregatedIngsList.reduce((sum, i) => sum + i.packageCost, 0);
    const totalCost = totalIngCost + totalGasCost + totalElecCost + totalPackCost + totalFuelCost;
    const totalProfit = totalRevenue - totalCost;
    const totalCakes = Array.from(bakeMap.values()).reduce((sum, b) => sum + b.totalQty, 0);

    return {
      bakeItems: Array.from(bakeMap.values()),
      unlinkedItems: unlinked,
      aggregatedIngredients: aggregatedIngsList,
      ordersFinancials: {
        totalOrders: selectedOrders.length,
        totalCakes,
        totalRevenue,
        totalIngCost,
        totalCommercialCost,
        totalGasCost,
        totalElecCost,
        totalPackCost,
        totalFuelCost,
        totalCost,
        totalProfit,
      },
    };
  }, [filteredOpenOrders, activeOrderSelection, recipes, ingredients, cfg, customPackageCounts]);

  // Shopping list data source: open orders or manual batch
  const shoppingItems = useMemo((): AggregatedIngredient[] => {
    if (shoppingSource === 'orders') {
      return aggregatedIngredients;
    }

    if (!manualBatchResult) return [];

    const list: AggregatedIngredient[] = manualBatchResult.ingredients.map((item, idx) => {
      const ing = item.ing;
      let effectiveUnit = item.unit;
      let effectiveQty = item.scaledQty;
      const isBanana = item.name.toLowerCase().includes('banana') || (ing && ing.name.toLowerCase().includes('banana'));
      if (isBanana && effectiveUnit === 'un') {
        effectiveUnit = 'g';
        if (effectiveQty < 15) {
          effectiveQty = Math.round(effectiveQty * 120);
        }
      }
      const baseUnit = UNIT_BASE[effectiveUnit] || 'g';
      const factor = UNIT_FACTORS[effectiveUnit] || 1;
      const baseQty = effectiveQty * factor;
      const proportionalCost = item.cost;

      const itemId = ing?.id || `manual-${idx}`;
      const stockUnit = ing?.unit || baseUnit;
      const stockFactor = UNIT_FACTORS[stockUnit] || 1;
      const availableStockBaseQty = Math.max(0, (ing?.stock || 0) * stockFactor);
      const deficitBaseQty = Math.max(0, baseQty - availableStockBaseQty);

      let defaultPackagesNeeded = 0;
      let packageCost = 0;
      let surplusBase = 0;

      if (ing && ing.size > 0) {
        const packFactor = UNIT_FACTORS[ing.unit] || 1;
        const packBaseSize = ing.size * packFactor;
        if (packBaseSize > 0) {
          defaultPackagesNeeded = deficitBaseQty > 0 ? Math.ceil(deficitBaseQty / packBaseSize) : 0;
        }
      } else if (deficitBaseQty > 0) {
        defaultPackagesNeeded = 1;
      }

      const packagesNeeded =
        customPackageCounts[itemId] !== undefined
          ? customPackageCounts[itemId]
          : defaultPackagesNeeded;

      if (ing && ing.size > 0) {
        const packFactor = UNIT_FACTORS[ing.unit] || 1;
        const packBaseSize = ing.size * packFactor;
        packageCost = packagesNeeded * (ing.price || 0);
        surplusBase = Math.max(0, (availableStockBaseQty + packagesNeeded * packBaseSize) - baseQty);
      } else {
        packageCost = deficitBaseQty > 0 ? proportionalCost : 0;
      }

      return {
        id: itemId,
        name: item.name,
        category: ing?.category || (isBanana ? 'Hortifrúti' : 'Geral'),
        baseQty,
        baseUnit,
        proportionalCost,
        packagesNeeded,
        packageCost,
        surplusBase,
        availableStockBaseQty,
        deficitBaseQty,
        ing,
        usedIn: [{ recipeName: manualBatchResult.recipe.name, count: safeCakeCount }],
      };
    });

    // Add cake packaging for manual batch!
    const packCostPerCake = Math.max(selectedSize.pack || currentRecipe.pack || 0, 0);
    const sizeLabel = selectedSize.nome && selectedSize.nome.toLowerCase() !== 'default' ? selectedSize.nome : 'Padrão';
    const packId = `pack-cake-manual-${currentRecipe.id}-${selectedSize.id || 'def'}`;
    const packName = sizeLabel !== 'Padrão'
      ? `Embalagem para Bolo (Tamanho ${sizeLabel})`
      : `Embalagem para Bolo (${currentRecipe.name})`;

    const matchedIng = ingredients.find(
      (i) =>
        i.id === packId ||
        (i.category === 'Embalagens' &&
          (i.name.toLowerCase() === packName.toLowerCase() ||
            i.name.toLowerCase().includes(sizeLabel.toLowerCase())))
    );

    const syntheticIng: Ingredient = matchedIng || {
      id: packId,
      name: packName,
      price: packCostPerCake,
      size: 1,
      unit: 'un',
      category: 'Embalagens',
      hist: [],
    };

    const cakeCountNeeded = safeCakeCount;
    const packSize = syntheticIng.size > 0 ? syntheticIng.size : 1;
    const defaultPackagesNeeded = Math.ceil(cakeCountNeeded / packSize);
    const packagesNeeded =
      customPackageCounts[packId] !== undefined
        ? customPackageCounts[packId]
        : defaultPackagesNeeded;

    const uPrice = syntheticIng.price !== undefined ? syntheticIng.price : packCostPerCake;
    const proportionalCost = cakeCountNeeded * (uPrice / packSize);
    const packageCost = packagesNeeded * uPrice;
    const surplusBase = Math.max(0, packagesNeeded * packSize - cakeCountNeeded);

    list.push({
      id: packId,
      name: packName,
      category: 'Embalagens',
      baseQty: cakeCountNeeded,
      baseUnit: 'un',
      proportionalCost,
      packagesNeeded,
      packageCost,
      surplusBase,
      ing: syntheticIng,
      usedIn: [{ recipeName: manualBatchResult.recipe.name, count: safeCakeCount }],
      isCakePackaging: true,
      cakeSizeName: sizeLabel,
      recipeIds: [currentRecipe.id],
    });

    list.sort((a, b) => {
      if (a.category !== b.category) {
        return (a.category || '').localeCompare(b.category || '');
      }
      return a.name.localeCompare(b.name);
    });

    return list;
  }, [
    shoppingSource,
    aggregatedIngredients,
    manualBatchResult,
    safeCakeCount,
    customPackageCounts,
    selectedSize,
    currentRecipe,
    cfg,
    ingredients,
  ]);

  // Format base quantities into friendly strings (e.g., 2,4 kg (2.400 g) or 360 g)
  const formatFriendlyQty = (baseQty: number, baseUnit: 'g' | 'ml' | 'un', itemName?: string) => {
    const isBanana = itemName ? itemName.toLowerCase().includes('banana') : false;

    // If unit is grams OR if banana with large quantity that was 'un'
    if (baseUnit === 'g' || (isBanana && baseUnit === 'un' && baseQty >= 15)) {
      if (baseQty >= 1000) {
        const kg = baseQty / 1000;
        return `${formatNumber(kg, 2)} kg (${formatNumber(Math.round(baseQty))} g)`;
      }
      return `${formatNumber(Math.round(baseQty))} g`;
    }
    if (baseUnit === 'ml') {
      if (baseQty >= 1000) {
        const l = baseQty / 1000;
        return `${formatNumber(l, 2)} L (${formatNumber(Math.round(baseQty))} ml)`;
      }
      return `${formatNumber(Math.round(baseQty))} ml`;
    }
    if (isBanana && baseUnit === 'un') {
      const grams = baseQty * 120;
      return `${formatNumber(Math.round(grams))} g (${formatNumber(baseQty)} un)`;
    }
    return `${formatNumber(Math.ceil(baseQty))} un`;
  };

  // Toggle ingredient in shopping list
  const togglePurchased = (id: string) => {
    setPurchasedIngredients((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const toggleWeighingCheck = (id: string) => {
    setCheckedWeighing((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  // Open edit modal for a shopping item
  const handleOpenEditItem = (item: AggregatedIngredient) => {
    const isBanana = item.name.toLowerCase().includes('banana') || (item.ing?.name || '').toLowerCase().includes('banana');
    setEditingItem(item);
    setEditPrice(item.ing?.price || 0);
    setEditSize(item.ing?.size || (isBanana ? 1 : 1000));
    let initialUnit = item.ing?.unit || (isBanana ? 'kg' : (item.baseUnit as Unit));
    if (isBanana && initialUnit === 'un') initialUnit = 'kg';
    setEditUnit(initialUnit);
    setEditPackagesCount(item.packagesNeeded);
    setEditSuccessMsg('');
  };

  // Step packages count up or down
  const handleStepPackage = (e: React.MouseEvent, itemId: string, currentVal: number, delta: number) => {
    e.stopPropagation();
    const nextVal = Math.max(1, currentVal + delta);
    setCustomPackageCounts((prev) => ({
      ...prev,
      [itemId]: nextVal,
    }));
  };

  // Save changes to ingredient (price, size, unit, hist) and update product costs
  const handleSaveItemEdit = () => {
    if (!editingItem) return;
    const isBanana = editingItem.name.toLowerCase().includes('banana') || (editingItem.ing?.name || '').toLowerCase().includes('banana');
    const finalUnit = isBanana && editUnit === 'un' ? 'kg' : editUnit;

    const targetIng = editingItem.ing || ingredients.find((i) => i.id === editingItem.id || i.name.toLowerCase() === editingItem.name.toLowerCase());

    const now = Date.now();
    const histEntry: PriceHistoryEntry = {
      d: now,
      price: editPrice,
      size: editSize,
      unit: finalUnit,
    };

    const updatedIng: Ingredient = {
      ...(targetIng || {
        id: editingItem.id.startsWith('manual-') || editingItem.id.startsWith('pack-') ? `ing-${now}` : editingItem.id,
        name: editingItem.name,
        category: editingItem.isCakePackaging ? 'Embalagens' : (editingItem.category || (isBanana ? 'Hortifrúti' : 'Geral')),
        hist: [],
      }),
      price: editPrice,
      size: editSize,
      unit: finalUnit,
      category: editingItem.isCakePackaging ? 'Embalagens' : (targetIng?.category || editingItem.category || (isBanana ? 'Hortifrúti' : 'Geral')),
      hist: [...(targetIng?.hist || []), histEntry],
    };

    if (onSaveIngredient) {
      onSaveIngredient(updatedIng);
    }

    // If it's a cake packaging item, also update the packaging cost on the recipes!
    if (onUpdateRecipe && editingItem.isCakePackaging && editingItem.recipeIds) {
      const unitPackCost = editSize > 0 ? editPrice / editSize : editPrice;
      for (const rId of editingItem.recipeIds) {
        const rec = recipes.find((r) => r.id === rId);
        if (!rec) continue;
        let modified = false;
        let newSizes = rec.sizes ? [...rec.sizes] : [];
        if (editingItem.cakeSizeName && newSizes.length > 0) {
          newSizes = newSizes.map((sz) => {
            if (
              sz.nome.toLowerCase() === editingItem.cakeSizeName?.toLowerCase() ||
              (editingItem.cakeSizeName === 'Padrão' && sz.id === 'default')
            ) {
              modified = true;
              return { ...sz, pack: unitPackCost };
            }
            return sz;
          });
        }
        const newBasePack =
          newSizes.length === 0 || editingItem.cakeSizeName === 'Padrão'
            ? unitPackCost
            : rec.pack || unitPackCost;
        if (modified || rec.pack !== newBasePack) {
          onUpdateRecipe({
            ...rec,
            pack: newBasePack,
            sizes: newSizes.length > 0 ? newSizes : rec.sizes,
          });
        }
      }
    }

    setCustomPackageCounts((prev) => ({
      ...prev,
      [editingItem.id]: Math.max(1, editPackagesCount),
    }));

    setEditSuccessMsg(
      editingItem.isCakePackaging
        ? 'Preço da embalagem atualizado no catálogo e nas receitas!'
        : 'Preço e embalagem atualizados! Custos recalculados.'
    );
    setTimeout(() => {
      setEditingItem(null);
      setEditSuccessMsg('');
    }, 700);
  };

  // Filter shopping items by category
  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const item of shoppingItems) {
      if (item.category) set.add(item.category);
    }
    return Array.from(set).sort();
  }, [shoppingItems]);

  const filteredShoppingItems = useMemo(() => {
    let list = shoppingItems;
    if (onlyShowDeficit) {
      list = list.filter(
        (i) =>
          (i.deficitBaseQty !== undefined ? i.deficitBaseQty > 0 : i.packagesNeeded > 0) ||
          customPackageCounts[i.id] !== undefined
      );
    }
    if (categoryFilter !== 'all') {
      list = list.filter((i) => i.category === categoryFilter);
    }
    return list;
  }, [shoppingItems, categoryFilter, onlyShowDeficit, customPackageCounts]);

  // Shopping list stats
  const totalShoppingItems = shoppingItems.length;
  const purchasedCount = shoppingItems.filter((i) => purchasedIngredients[i.id]).length;
  const totalShoppingBudget = shoppingItems.reduce((sum, i) => sum + i.packageCost, 0);

  // Copy shopping list to WhatsApp formatted text
  const handleCopyWhatsAppShoppingList = () => {
    const today = new Date().toLocaleDateString('pt-BR');
    const sourceLabel =
      shoppingSource === 'orders'
        ? `Encomendas em Aberto (${ordersFinancials.totalOrders} pedidos, ${ordersFinancials.totalCakes} bolos)`
        : `Fornada Manual: ${currentRecipe?.name} (${safeCakeCount} un)`;

    let text = `🛒 *LISTA DE COMPRAS — CASEIRINHOS FER&DRE*\n`;
    text += `📅 *Data:* ${today}\n`;
    text += `📦 *Produção:* ${sourceLabel}\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━\n\n`;

    // Group by category
    const grouped = new Map<string, AggregatedIngredient[]>();
    for (const item of shoppingItems) {
      const cat = item.category || 'Geral';
      if (!grouped.has(cat)) grouped.set(cat, []);
      grouped.get(cat)!.push(item);
    }

    grouped.forEach((items, cat) => {
      text += `📌 *${cat.toUpperCase()}*\n`;
      items.forEach((item) => {
        const check = purchasedIngredients[item.id] ? '✅' : '⬜';
        const friendlyQty = formatFriendlyQty(item.baseQty, item.baseUnit, item.name);
        let packInfo = '';
        if (item.ing && item.ing.size > 0) {
          packInfo = ` 👉 Comprar: *${item.packagesNeeded}×* de ${item.ing.size} ${item.ing.unit}`;
          if (item.packageCost > 0) {
            packInfo += ` (${formatCurrency(item.packageCost)})`;
          }
        }
        text += `${check} *${item.name}*: ${friendlyQty}${packInfo}\n`;
      });
      text += `\n`;
    });

    text += `━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `💰 *Orçamento Estimado em Embalagens:* ${formatCurrency(totalShoppingBudget)}\n`;
    text += `_Gerado pelo Caseirinhos Fer&Dre_`;

    navigator.clipboard.writeText(text).then(() => {
      setCopiedToast(true);
      setTimeout(() => setCopiedToast(false), 3000);
    });
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Mode Selector */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-stone-900 dark:text-stone-100 font-display flex items-center gap-2">
            <Scale className="w-5 h-5 sm:w-6 sm:h-6 text-amber-600 dark:text-amber-400 shrink-0" />
            <span>Escalonar Produção & Lista de Compras</span>
          </h2>
          <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-400 mt-0.5">
            Calcule insumos exatos por encomendas em aberto ou forneie fornadas sob demanda.
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-2 no-print">
          <button
            onClick={handlePrint}
            className="flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-stone-700 dark:text-stone-200 bg-white dark:bg-stone-900 hover:bg-stone-50 dark:hover:bg-stone-800 border border-stone-200 dark:border-stone-800 rounded-xl shadow-xs transition-colors min-h-[40px]"
            title="Imprimir relatório atual"
          >
            <Printer className="w-4 h-4 text-stone-600 dark:text-stone-400 shrink-0" />
            <span className="hidden sm:inline">Imprimir</span>
          </button>
        </div>
      </div>

      {/* Main Mode Navigation Bar (Zero-pill style) */}
      <div className="bg-stone-100 dark:bg-stone-800/80 p-1 rounded-xl flex items-center gap-1 border border-stone-200 dark:border-stone-800 text-xs sm:text-sm font-semibold no-print">
        <button
          type="button"
          onClick={() => setMode('orders')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg transition-all min-h-[42px] ${
            mode === 'orders'
              ? 'bg-white dark:bg-stone-900 text-amber-900 dark:text-amber-300 font-bold shadow-xs'
              : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
          }`}
        >
          <ClipboardList className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
          <span>Produção por Encomendas Abertas</span>
          {openOrders.length > 0 && (
            <span className="bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 text-[11px] px-2 py-0.5 rounded font-bold">
              {openOrders.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => {
            setMode('shopping');
            setShoppingSource(mode === 'manual' ? 'manual' : 'orders');
          }}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg transition-all min-h-[42px] ${
            mode === 'shopping'
              ? 'bg-white dark:bg-stone-900 text-amber-900 dark:text-amber-300 font-bold shadow-xs'
              : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
          }`}
        >
          <ShoppingCart className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
          <span>Gerar Lista de Compras</span>
          {shoppingItems.length > 0 && (
            <span className="bg-stone-200 dark:bg-stone-700 text-stone-800 dark:text-stone-300 text-[11px] px-2 py-0.5 rounded font-bold">
              {shoppingItems.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setMode('manual')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg transition-all min-h-[42px] ${
            mode === 'manual'
              ? 'bg-white dark:bg-stone-900 text-amber-900 dark:text-amber-300 font-bold shadow-xs'
              : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
          }`}
        >
          <Layers className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
          <span>Fornada Individual</span>
        </button>
      </div>

      {/* ========================================================
          MODE 1: PRODUÇÃO POR ENCOMENDAS ABERTAS
          ======================================================== */}
      {mode === 'orders' && (
        <div className="space-y-6">
          {/* Filter Bar & Order Selection Panel */}
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 dark:border-stone-800 pb-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                <h3 className="text-base font-bold text-stone-900 dark:text-stone-100 font-display">
                  Encomendas Selecionadas para o Lote
                </h3>
              </div>

              {/* Status Tabs */}
              <div className="flex items-center gap-1 bg-stone-50 dark:bg-stone-800 p-1 rounded-xl text-xs border border-stone-200 dark:border-stone-700">
                <button
                  type="button"
                  onClick={() => setStatusFilter('all_open')}
                  className={`px-2.5 py-1.5 rounded-lg font-semibold transition-colors ${
                    statusFilter === 'all_open'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
                  }`}
                >
                  Todas Abertas ({openOrders.length})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('pendente')}
                  className={`px-2.5 py-1.5 rounded-lg font-semibold transition-colors ${
                    statusFilter === 'pendente'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
                  }`}
                >
                  Pendentes ({openOrders.filter((o) => o.status === 'pendente').length})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('pronto')}
                  className={`px-2.5 py-1.5 rounded-lg font-semibold transition-colors ${
                    statusFilter === 'pronto'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
                  }`}
                >
                  Prontas ({openOrders.filter((o) => o.status === 'pronto').length})
                </button>
              </div>
            </div>

            {openOrders.length === 0 ? (
              <div className="text-center py-10 px-4 bg-stone-50 dark:bg-stone-800/40 rounded-xl border border-dashed border-stone-200 dark:border-stone-700">
                <Cake className="w-10 h-10 text-stone-400 mx-auto mb-2" />
                <h4 className="font-bold text-stone-800 dark:text-stone-200 text-sm">
                  Nenhuma encomenda em aberto no momento
                </h4>
                <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 max-w-md mx-auto">
                  Todas as encomendas registradas já foram entregues ou você ainda não cadastrou novas encomendas na aba Encomendas.
                </p>
              </div>
            ) : (
              <>
                {/* Orders Checklist Grid */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-stone-600 dark:text-stone-400 px-1">
                    <span>
                      {selectedOrdersCount} de {filteredOpenOrders.length} encomendas incluídas nesta fornada
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleSelectAllOrders(true)}
                        className="text-amber-700 dark:text-amber-400 hover:underline font-semibold"
                      >
                        Marcar todas
                      </button>
                      <span>·</span>
                      <button
                        type="button"
                        onClick={() => handleSelectAllOrders(false)}
                        className="text-stone-500 hover:underline font-semibold"
                      >
                        Desmarcar
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-60 overflow-y-auto pr-1">
                    {filteredOpenOrders.map((ord) => {
                      const isSelected = activeOrderSelection[ord.id] !== false;
                      const formattedDate = ord.entrega
                        ? new Date(ord.entrega + 'T12:00:00').toLocaleDateString('pt-BR', {
                            weekday: 'short',
                            day: '2-digit',
                            month: '2-digit',
                          })
                        : 'Sem data';

                      return (
                        <div
                          key={ord.id}
                          onClick={() => toggleOrderSelection(ord.id)}
                          className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${
                            isSelected
                              ? 'bg-amber-50/60 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800'
                              : 'bg-stone-50/60 dark:bg-stone-800/40 border-stone-200 dark:border-stone-800 opacity-60'
                          }`}
                        >
                          <button
                            type="button"
                            className="mt-0.5 text-amber-700 dark:text-amber-400 shrink-0"
                          >
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                            ) : (
                              <Square className="w-4 h-4 text-stone-400 dark:text-stone-600" />
                            )}
                          </button>
                          <div className="flex-1 min-w-0 text-xs">
                            <div className="flex items-center justify-between gap-1">
                              <strong className="text-stone-900 dark:text-stone-100 truncate font-semibold">
                                {ord.cliente}
                              </strong>
                              <span
                                className={`text-[10px] font-bold px-1.5 py-0.5 rounded capitalize ${
                                  ord.status === 'pronto'
                                    ? 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300'
                                    : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                }`}
                              >
                                {ord.status}
                              </span>
                            </div>
                            <div className="text-stone-500 dark:text-stone-400 flex items-center gap-2 mt-0.5">
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {formattedDate} {ord.hora ? `às ${ord.hora}` : ''}
                              </span>
                              <span>·</span>
                              <span className="font-semibold text-stone-700 dark:text-stone-300">
                                {formatCurrency(ord.valor || 0)}
                              </span>
                            </div>
                            <div className="text-[11px] text-stone-600 dark:text-stone-400 truncate mt-1">
                              {ord.itens.map((it) => `${it.qtd}× ${it.sabor || it.tipo}`).join(', ')}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Warning about unlinked items */}
                {unlinkedItems.length > 0 && (
                  <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl flex items-start gap-2.5 text-xs text-amber-800 dark:text-amber-300">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <strong className="font-bold">
                        {unlinkedItems.length} item(ns) sem receita vinculada:
                      </strong>
                      <p className="mt-0.5 text-stone-600 dark:text-stone-400">
                        {unlinkedItems
                          .map((it) => `${it.itemName} (${it.client})`)
                          .join(', ')}
                        . Os ingredientes destes itens não foram somados ao lote. Para incluir, vincule o item à receita correspondente na aba de Encomendas.
                      </p>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Aggregated KPI Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
            <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-3.5 sm:p-4 shadow-xs">
              <span className="text-[11px] sm:text-xs text-stone-500 dark:text-stone-400 block mb-0.5">
                Bolos / Itens a Fazer
              </span>
              <strong className="text-base sm:text-xl font-bold text-stone-900 dark:text-stone-100 tabular-nums font-display block">
                {ordersFinancials.totalCakes} bolos
              </strong>
              <span className="text-[10px] sm:text-[11px] text-stone-500 dark:text-stone-400 block mt-0.5">
                Em {ordersFinancials.totalOrders} encomendas
              </span>
            </div>

            <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-3.5 sm:p-4 shadow-xs">
              <span className="text-[11px] sm:text-xs text-stone-500 dark:text-stone-400 block mb-0.5">
                Faturamento Previsto
              </span>
              <strong className="text-base sm:text-xl font-bold text-sky-700 dark:text-sky-400 tabular-nums font-display block">
                {formatCurrency(ordersFinancials.totalRevenue)}
              </strong>
              <span className="text-[10px] sm:text-[11px] text-stone-500 dark:text-stone-400 block mt-0.5">
                Total a receber
              </span>
            </div>

            <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-3.5 sm:p-4 shadow-xs">
              <span className="text-[11px] sm:text-xs text-stone-500 dark:text-stone-400 block mb-0.5">
                Custo Total Estimado
              </span>
              <strong className="text-base sm:text-xl font-bold text-stone-900 dark:text-stone-100 tabular-nums font-display block">
                {formatCurrency(ordersFinancials.totalCost)}
              </strong>
              <span className="text-[10px] sm:text-[11px] text-stone-500 dark:text-stone-400 block mt-0.5">
                Ingredientes + Insumos + Gás
              </span>
            </div>

            <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-3.5 sm:p-4 shadow-xs">
              <span className="text-[11px] sm:text-xs text-stone-500 dark:text-stone-400 block mb-0.5">
                Lucro Estimado do Lote
              </span>
              <strong
                className={`text-base sm:text-xl font-bold tabular-nums font-display block ${
                  ordersFinancials.totalProfit >= 0
                    ? 'text-emerald-700 dark:text-emerald-400'
                    : 'text-rose-700 dark:text-rose-400'
                }`}
              >
                {formatCurrency(ordersFinancials.totalProfit)}
              </strong>
              <span className="text-[10px] sm:text-[11px] text-stone-500 dark:text-stone-400 block mt-0.5">
                {ordersFinancials.totalRevenue > 0
                  ? formatPercent(
                      (ordersFinancials.totalProfit / ordersFinancials.totalRevenue) * 100
                    )
                  : '0%'}{' '}
                de margem
              </span>
            </div>
          </div>

          {/* Cakes / Batches to Produce List */}
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-100 dark:border-stone-800 pb-3">
              <div className="flex items-center gap-2">
                <Cake className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                <h3 className="text-base font-bold text-stone-900 dark:text-stone-100 font-display">
                  Grade de Produção (Bolos a Assar)
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsPreviewGridOpen(true)}
                  className="flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-stone-800 dark:text-stone-200 bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 rounded-xl transition-colors min-h-[36px]"
                  title="Pré-visualizar grade de produção formatada para impressão A4 com caixas de marcação a caneta [ ]"
                >
                  <Printer className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  <span>Imprimir / PDF da Grade</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShoppingSource('orders');
                    setMode('shopping');
                  }}
                  className="flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-xs transition-colors min-h-[36px]"
                >
                  <ShoppingCart className="w-3.5 h-3.5" />
                  <span>Ver Lista de Compras deste Lote</span>
                </button>
              </div>
            </div>

            {bakeItems.length === 0 ? (
              <p className="text-xs text-stone-500 dark:text-stone-400 italic">
                Nenhum bolo com receita vinculada para produzir nas encomendas selecionadas.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {bakeItems.map((item) => (
                  <div
                    key={item.key}
                    className="p-3.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-800/40 space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-bold text-stone-900 dark:text-stone-100 text-sm font-display">
                          {item.recipeName}
                        </h4>
                        <div className="flex items-center gap-2 text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                          <span>Tamanho: <strong className="text-stone-700 dark:text-stone-300">{item.sizeName}</strong></span>
                          <span>·</span>
                          <span>Fator: <strong className="text-stone-700 dark:text-stone-300">{item.k}×</strong></span>
                        </div>
                      </div>
                      <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300 shrink-0">
                        {item.totalQty} {item.totalQty > 1 ? 'bolos' : 'bolo'}
                      </span>
                    </div>

                    {/* Clients waiting */}
                    <div className="pt-2 border-t border-stone-200/60 dark:border-stone-700/60 text-xs">
                      <span className="text-stone-500 dark:text-stone-400 text-[11px] block mb-1">
                        Destinado às encomendas:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {item.orders.map((ord, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1 bg-white dark:bg-stone-900 px-2 py-0.5 rounded-md border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 text-[11px]"
                          >
                            <User className="w-3 h-3 text-stone-400" />
                            <strong>{ord.client}</strong> ({ord.qty} un)
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Consolidated Weighing List (Lista de Pesagem para a Bancada) */}
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-stone-100 dark:border-stone-800 pb-3">
              <div className="flex items-center gap-2">
                <Scale className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                <h3 className="text-base font-bold text-stone-900 dark:text-stone-100 font-display">
                  Lista de Pesagem Consolidada (Para a Cozinha)
                </h3>
              </div>
              <span className="text-xs text-stone-500 dark:text-stone-400">
                {Object.values(checkedWeighing).filter(Boolean).length} de {aggregatedIngredients.length} pesados
              </span>
            </div>

            <p className="text-xs text-stone-500 dark:text-stone-400">
              Soma exata de todos os ingredientes necessários para preparar todas as encomendas selecionadas. Use os botões para riscar conforme pesar na bancada.
            </p>

            <div className="border border-stone-200 dark:border-stone-800 rounded-xl overflow-hidden text-xs sm:text-sm">
              <table className="w-full text-left">
                <thead className="bg-stone-50 dark:bg-stone-800 border-b border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300">
                  <tr>
                    <th className="py-2.5 px-3 font-semibold w-12 text-center">Status</th>
                    <th className="py-2.5 px-3 font-semibold">Ingrediente</th>
                    <th className="py-2.5 px-3 font-semibold">Categoria</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Qtd Consolidada</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Custo Proporcional</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                  {aggregatedIngredients.map((item) => {
                    const isChecked = !!checkedWeighing[item.id];

                    return (
                      <tr
                        key={item.id}
                        onClick={() => toggleWeighingCheck(item.id)}
                        className={`cursor-pointer transition-colors ${
                          isChecked
                            ? 'bg-amber-50/40 dark:bg-amber-950/20 text-stone-400 dark:text-stone-500 line-through'
                            : 'hover:bg-stone-50 dark:hover:bg-stone-800/50'
                        }`}
                      >
                        <td className="py-2.5 px-3 text-center">
                          <button
                            type="button"
                            className="text-stone-400 hover:text-amber-700 dark:hover:text-amber-400 p-1 min-h-[36px] min-w-[36px] flex items-center justify-center mx-auto"
                          >
                            {isChecked ? (
                              <CheckSquare className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                            ) : (
                              <Square className="w-4 h-4 text-stone-300 dark:text-stone-600" />
                            )}
                          </button>
                        </td>
                        <td className="py-2.5 px-3 font-medium text-stone-900 dark:text-stone-100">
                          <div>
                            <span>{item.name}</span>
                            <div className="text-[10px] text-stone-500 dark:text-stone-400">
                              Usado em: {item.usedIn.map((u) => `${u.recipeName} (${u.count}x)`).join(', ')}
                            </div>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-stone-500 dark:text-stone-400">
                          {item.category || 'Geral'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-amber-950 dark:text-amber-300 tabular-nums">
                          {formatFriendlyQty(item.baseQty, item.baseUnit, item.name)}
                        </td>
                        <td className="py-2.5 px-3 text-right text-stone-600 dark:text-stone-400 tabular-nums">
                          {formatCurrency(item.proportionalCost)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Operating utilities row */}
            <div className="p-3.5 bg-stone-50 dark:bg-stone-800/60 border border-stone-200/80 dark:border-stone-800 rounded-xl space-y-2 text-xs">
              <h4 className="font-semibold text-stone-700 dark:text-stone-300">
                Insumos & Custos Operacionais Consolidados:
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-stone-600 dark:text-stone-400">
                <div>
                  <span>Gás de Cozinha:</span>{' '}
                  <strong className="text-stone-900 dark:text-stone-100 tabular-nums">
                    {formatCurrency(ordersFinancials.totalGasCost)}
                  </strong>
                </div>
                <div>
                  <span>Energia Elétrica:</span>{' '}
                  <strong className="text-stone-900 dark:text-stone-100 tabular-nums">
                    {formatCurrency(ordersFinancials.totalElecCost)}
                  </strong>
                </div>
                <div>
                  <span>Embalagens ({ordersFinancials.totalCakes} un):</span>{' '}
                  <strong className="text-stone-900 dark:text-stone-100 tabular-nums">
                    {formatCurrency(ordersFinancials.totalPackCost)}
                  </strong>
                </div>
                <div>
                  <span>Outros Insumos:</span>{' '}
                  <strong className="text-stone-900 dark:text-stone-100 tabular-nums">
                    {formatCurrency(ordersFinancials.totalFuelCost)}
                  </strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODE 2: LISTA DE COMPRAS
          ======================================================== */}
      {mode === 'shopping' && (
        <div className="space-y-6">
          {/* Shopping Header & Source Switcher */}
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 dark:border-stone-800 pb-3">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                <div>
                  <h3 className="text-base font-bold text-stone-900 dark:text-stone-100 font-display">
                    Lista de Compras Inteligente
                  </h3>
                  <p className="text-xs text-stone-500 dark:text-stone-400">
                    Calcula a quantidade em embalagens fechadas no mercado e o orçamento estimado.
                  </p>
                </div>
              </div>

              {/* Source Switcher */}
              <div className="flex items-center gap-1 bg-stone-50 dark:bg-stone-800 p-1 rounded-xl text-xs border border-stone-200 dark:border-stone-700 no-print">
                <button
                  type="button"
                  onClick={() => setShoppingSource('orders')}
                  className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                    shoppingSource === 'orders'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
                  }`}
                >
                  Das Encomendas Abertas ({ordersFinancials.totalOrders})
                </button>
                <button
                  type="button"
                  onClick={() => setShoppingSource('manual')}
                  className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                    shoppingSource === 'manual'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
                  }`}
                >
                  Da Fornada Individual
                </button>
              </div>
            </div>

            {/* Shopping Action Strip */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1 no-print">
              {/* Category Filter & Stock Abatement Toggle */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Stock Deduction Toggle */}
                <button
                  type="button"
                  onClick={() => setOnlyShowDeficit((prev) => !prev)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-xl border transition-all flex items-center gap-1.5 min-h-[36px] ${
                    onlyShowDeficit
                      ? 'bg-amber-100 text-amber-950 dark:bg-amber-950/80 dark:text-amber-200 border-amber-300 dark:border-amber-700/80'
                      : 'bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300 border-stone-200 dark:border-stone-700'
                  }`}
                  title="Abater a quantidade disponível no estoque das receitas necessárias"
                >
                  <Package className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                  <span>{onlyShowDeficit ? 'Apenas a Comprar (Estoque Abatido)' : 'Exibir Todos os Insumos'}</span>
                </button>

                <div className="flex items-center gap-1.5">
                  <Filter className="w-4 h-4 text-stone-400" />
                  <span className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                    Categoria:
                  </span>
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="px-2.5 py-1.5 text-xs font-semibold bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg text-stone-800 dark:text-stone-200"
                  >
                    <option value="all">Todas as Categorias ({shoppingItems.length})</option>
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Action Buttons: WhatsApp & Bulk Check */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const allChecked = purchasedCount === totalShoppingItems;
                    const updated: Record<string, boolean> = {};
                    shoppingItems.forEach((i) => {
                      updated[i.id] = !allChecked;
                    });
                    setPurchasedIngredients(updated);
                  }}
                  className="px-3 py-1.5 text-xs font-semibold text-stone-700 dark:text-stone-300 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 rounded-xl transition-colors"
                >
                  {purchasedCount === totalShoppingItems ? 'Desmarcar Todos' : 'Marcar Todos'}
                </button>

                <button
                  type="button"
                  onClick={handleCopyWhatsAppShoppingList}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-colors"
                >
                  {copiedToast ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Copiado para WhatsApp!</span>
                    </>
                  ) : (
                    <>
                      <Share2 className="w-4 h-4" />
                      <span>Copiar para WhatsApp</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Shopping Progress Bar */}
            <div className="space-y-1.5 pt-2">
              <div className="flex items-center justify-between text-xs text-stone-600 dark:text-stone-400">
                <span>
                  Progresso das Compras: <strong>{purchasedCount} de {totalShoppingItems} itens no carrinho</strong>
                </span>
                <span className="font-bold text-amber-700 dark:text-amber-400">
                  {totalShoppingItems > 0 ? Math.round((purchasedCount / totalShoppingItems) * 100) : 0}%
                </span>
              </div>
              <div className="w-full bg-stone-100 dark:bg-stone-800 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-emerald-600 h-2 rounded-full transition-all duration-300"
                  style={{
                    width: `${totalShoppingItems > 0 ? (purchasedCount / totalShoppingItems) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>
          </div>

          {/* Shopping Budget Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-4 shadow-xs">
              <span className="text-xs text-stone-500 dark:text-stone-400 block mb-0.5">
                Total de Itens na Lista
              </span>
              <strong className="text-xl font-bold text-stone-900 dark:text-stone-100 tabular-nums font-display block">
                {totalShoppingItems} ingredientes
              </strong>
              <span className="text-[11px] text-stone-500 dark:text-stone-400 block mt-0.5">
                {purchasedCount} comprados, {totalShoppingItems - purchasedCount} pendentes
              </span>
            </div>

            <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-4 shadow-xs">
              <span className="text-xs text-stone-500 dark:text-stone-400 block mb-0.5">
                Orçamento de Compras (Pacotes Fechados)
              </span>
              <strong className="text-xl font-bold text-amber-700 dark:text-amber-400 tabular-nums font-display block">
                {formatCurrency(totalShoppingBudget)}
              </strong>
              <span className="text-[11px] text-stone-500 dark:text-stone-400 block mt-0.5">
                Estimativa total para levar ao mercado
              </span>
            </div>

            <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-4 shadow-xs">
              <span className="text-xs text-stone-500 dark:text-stone-400 block mb-0.5">
                Custo Efetivo Utilizado nas Receitas
              </span>
              <strong className="text-xl font-bold text-stone-900 dark:text-stone-100 tabular-nums font-display block">
                {formatCurrency(
                  shoppingItems.reduce((sum, i) => sum + i.proportionalCost, 0)
                )}
              </strong>
              <span className="text-[11px] text-stone-500 dark:text-stone-400 block mt-0.5">
                Diferença vira sobra para seu estoque
              </span>
            </div>
          </div>

          {/* Interactive Shopping Items List */}
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
            {filteredShoppingItems.length === 0 ? (
              <div className="text-center py-10 px-4 bg-stone-50 dark:bg-stone-800/40 rounded-xl border border-dashed border-stone-200 dark:border-stone-700">
                <ShoppingCart className="w-10 h-10 text-stone-400 mx-auto mb-2" />
                <h4 className="font-bold text-stone-800 dark:text-stone-200 text-sm">
                  Nenhum ingrediente nesta lista
                </h4>
                <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 max-w-md mx-auto">
                  {shoppingSource === 'orders'
                    ? 'Selecione encomendas com receitas cadastradas na aba de Encomendas Abertas.'
                    : 'Configure a receita e quantidade na aba Fornada Individual.'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredShoppingItems.map((item) => {
                  const isChecked = !!purchasedIngredients[item.id];
                  const hasPackInfo = item.ing && item.ing.size > 0;

                  return (
                    <div
                      key={item.id}
                      onClick={() => togglePurchased(item.id)}
                      className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                        isChecked
                          ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/60 opacity-60'
                          : 'bg-white dark:bg-stone-800/60 border-stone-200 dark:border-stone-700 hover:border-amber-300 dark:hover:border-amber-700'
                      }`}
                    >
                      {/* Left: Checkbox & Name */}
                      <div className="flex items-start gap-3">
                        <button
                          type="button"
                          className="mt-0.5 text-stone-400 hover:text-emerald-600 dark:hover:text-emerald-400 p-0.5"
                        >
                          {isChecked ? (
                            <CheckSquare className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                          ) : (
                            <Square className="w-5 h-5 text-stone-300 dark:text-stone-600" />
                          )}
                        </button>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <strong
                              className={`text-sm font-semibold flex items-center gap-1.5 ${
                                isChecked
                                  ? 'text-stone-500 dark:text-stone-400 line-through'
                                  : 'text-stone-900 dark:text-stone-100'
                              }`}
                            >
                              {item.isCakePackaging && (
                                <Package className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                              )}
                              <span>{item.name}</span>
                            </strong>
                            <span
                              className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                                item.isCakePackaging
                                  ? 'bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 font-bold border border-amber-200 dark:border-amber-800'
                                  : 'bg-stone-100 dark:bg-stone-700 text-stone-600 dark:text-stone-300'
                              }`}
                            >
                              {item.category || 'Geral'}
                            </span>
                          </div>

                          <div className="text-xs text-stone-500 dark:text-stone-400 mt-1 flex items-center gap-2 flex-wrap">
                            <span>
                              {item.isCakePackaging ? 'Necessário:' : 'Necessidade total:'}{' '}
                              <strong>{formatFriendlyQty(item.baseQty, item.baseUnit, item.name)}</strong>
                            </span>

                            {item.availableStockBaseQty !== undefined && item.availableStockBaseQty > 0 && (
                              <span className="text-[11px] text-amber-800 dark:text-amber-300 font-bold bg-amber-50 dark:bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-200 dark:border-amber-800">
                                📦 Em estoque: {formatFriendlyQty(item.availableStockBaseQty, item.baseUnit, item.name)}
                              </span>
                            )}

                            {item.deficitBaseQty !== undefined && item.deficitBaseQty > 0 && item.availableStockBaseQty !== undefined && item.availableStockBaseQty > 0 && (
                              <span className="text-[11px] text-rose-700 dark:text-rose-300 font-bold">
                                🛒 Faltante: {formatFriendlyQty(item.deficitBaseQty, item.baseUnit, item.name)}
                              </span>
                            )}

                            {item.surplusBase > 0 && hasPackInfo && (
                              <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">
                                (Sobra pós-compra: {formatFriendlyQty(item.surplusBase, item.baseUnit, item.name)})
                              </span>
                            )}
                            {item.isCakePackaging && item.usedIn && item.usedIn.length > 0 && (
                              <span className="text-[11px] text-amber-800 dark:text-amber-300 font-medium">
                                · Para: {item.usedIn.map((u) => `${u.count}× ${u.recipeName}`).join(', ')}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right: Package Calculation, Stepper, Cost & Edit button */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between sm:justify-end gap-2.5 pl-8 sm:pl-0">
                        {hasPackInfo ? (
                          <div className="flex items-center gap-2">
                            {/* Stepper for packagesNeeded */}
                            <div
                              className="flex items-center bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg p-0.5"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                type="button"
                                onClick={(e) => handleStepPackage(e, item.id, item.packagesNeeded, -1)}
                                disabled={item.packagesNeeded <= 1}
                                className="w-6 h-6 flex items-center justify-center rounded text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                title="Diminuir embalagens"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="px-2 text-xs font-bold text-stone-800 dark:text-stone-200 tabular-nums">
                                {item.packagesNeeded}×
                              </span>
                              <button
                                type="button"
                                onClick={(e) => handleStepPackage(e, item.id, item.packagesNeeded, 1)}
                                className="w-6 h-6 flex items-center justify-center rounded text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors"
                                title="Aumentar embalagens"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>

                            <div className="text-left sm:text-right">
                              <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-lg bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-300">
                                <Package className="w-3 h-3" />
                                {item.ing?.size} {item.ing?.unit}
                              </span>
                              <span className="block text-[11px] text-stone-500 dark:text-stone-400 mt-0.5 tabular-nums">
                                {formatCurrency(item.packageCost)} ({formatCurrency(item.ing?.price || 0)}/emb)
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="text-left sm:text-right">
                            <span className="text-xs font-bold text-stone-700 dark:text-stone-300">
                              {formatFriendlyQty(item.baseQty, item.baseUnit, item.name)}
                            </span>
                            <span className="block text-[11px] text-stone-500 dark:text-stone-400 mt-0.5 tabular-nums">
                              {formatCurrency(item.proportionalCost)}
                            </span>
                          </div>
                        )}

                        {/* Edit Price / Packaging Button */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenEditItem(item);
                          }}
                          className="flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 hover:bg-amber-50 dark:bg-stone-800 dark:hover:bg-amber-950/40 text-stone-700 hover:text-amber-800 dark:text-stone-300 dark:hover:text-amber-300 text-xs font-semibold transition-colors"
                          title="Alterar preço, tamanho da embalagem ou quantidade"
                        >
                          <Pencil className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                          <span>Ajustar</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Quick Edit Modal for Shopping List Item */}
          {editingItem && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs"
              onClick={() => setEditingItem(null)}
            >
              <div
                className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-start justify-between gap-3 border-b border-stone-100 dark:border-stone-800 pb-3">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                      Ajuste na Lista de Compras
                    </span>
                    <h3 className="text-lg font-bold text-stone-900 dark:text-stone-100 font-display">
                      {editingItem.name}
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditingItem(null)}
                    className="p-1 rounded-lg text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {editingItem.isCakePackaging ? (
                  <div className="p-3 bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/60 rounded-xl text-xs text-amber-900 dark:text-amber-300 space-y-1">
                    <div className="flex items-center gap-1.5 font-bold">
                      <Package className="w-4 h-4 text-amber-700 dark:text-amber-400 shrink-0" />
                      <span>Embalagem do Bolo & Atualização de Custos</span>
                    </div>
                    <p className="text-stone-600 dark:text-stone-400 text-[11px]">
                      Ao alterar o preço ou quantidade desta embalagem, o custo de embalagem das receitas correspondentes será atualizado automaticamente, recalculando o custo do bolo e preço de venda sugerido.
                    </p>
                  </div>
                ) : (
                  <div className="p-3 bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/60 rounded-xl text-xs text-amber-900 dark:text-amber-300 space-y-1">
                    <div className="flex items-center gap-1.5 font-bold">
                      <History className="w-4 h-4 text-amber-700 dark:text-amber-400 shrink-0" />
                      <span>Impacto nos Custos & Histórico de Preços</span>
                    </div>
                    <p className="text-stone-600 dark:text-stone-400 text-[11px]">
                      Alterar o preço ou tamanho da embalagem atualiza o ingrediente no catálogo, recalcula automaticamente o custo de todas as receitas e fornadas no sistema, e grava o registro no histórico de preços.
                    </p>
                  </div>
                )}

                <div className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                      Preço Pago por Embalagem (R$)
                    </label>
                    <NumericInput
                      value={editPrice}
                      onChange={(val) => setEditPrice(val)}
                      placeholder="0,00"
                      min={0}
                      maxDecimals={2}
                      prefix="R$"
                      className="w-full px-3.5 py-2.5 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-sm font-bold text-stone-900 dark:text-stone-100 focus:bg-white dark:focus:bg-stone-800 focus:border-amber-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                        Tamanho da Embalagem
                      </label>
                      <NumericInput
                        value={editSize}
                        onChange={(val) => setEditSize(val)}
                        placeholder="1000"
                        min={0.01}
                        maxDecimals={2}
                        className="w-full px-3.5 py-2.5 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-sm font-semibold text-stone-900 dark:text-stone-100 focus:bg-white dark:focus:bg-stone-800 focus:border-amber-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                        Unidade da Embalagem
                      </label>
                      <select
                        value={editUnit}
                        onChange={(e) => setEditUnit(e.target.value as Unit)}
                        className="w-full px-3.5 py-2.5 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-sm font-semibold text-stone-900 dark:text-stone-100 focus:bg-white dark:focus:bg-stone-800 focus:border-amber-500 min-h-[44px]"
                      >
                        {(() => {
                          const isBanana =
                            editingItem.name.toLowerCase().includes('banana') ||
                            (editingItem.ing?.name || '').toLowerCase().includes('banana');
                          if (isBanana) {
                            return (
                              <>
                                <option value="kg">kg (Quilograma)</option>
                                <option value="g">g (Gramas)</option>
                              </>
                            );
                          }
                          return (
                            <>
                              <option value="g">g (Gramas)</option>
                              <option value="kg">kg (Quilogramas)</option>
                              <option value="ml">ml (Mililitros)</option>
                              <option value="L">L (Litros)</option>
                              <option value="un">un (Unidades)</option>
                            </>
                          );
                        })()}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                      Quantidade de Embalagens a Comprar
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setEditPackagesCount((prev) => Math.max(1, prev - 1))}
                        disabled={editPackagesCount <= 1}
                        className="w-10 h-10 flex items-center justify-center rounded-xl bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 disabled:opacity-40"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <NumericInput
                        value={editPackagesCount}
                        onChange={(val) => setEditPackagesCount(Math.max(1, Math.round(val)))}
                        placeholder="1"
                        min={1}
                        maxDecimals={0}
                        suffix="emb."
                        className="flex-1 text-center font-bold px-3 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => setEditPackagesCount((prev) => prev + 1)}
                        className="w-10 h-10 flex items-center justify-center rounded-xl bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Live Calculation Preview */}
                  <div className="p-3 bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700 rounded-xl space-y-1.5 text-xs">
                    <div className="flex items-center justify-between text-stone-600 dark:text-stone-400">
                      <span>Custo Unitário Resultante:</span>
                      <strong className="text-stone-900 dark:text-stone-100 tabular-nums">
                        {(() => {
                          const factor = UNIT_FACTORS[editUnit] || 1;
                          const baseSize = editSize * factor;
                          if (baseSize <= 0) return 'R$ 0,00';
                          const baseUnit = UNIT_BASE[editUnit] || 'g';
                          const uCost = (editPrice / baseSize) * (baseUnit === 'un' ? 1 : 1000);
                          const displayUnit = baseUnit === 'un' ? 'un' : baseUnit === 'g' ? 'kg' : 'L';
                          return `${formatCurrency(uCost)} / ${displayUnit}`;
                        })()}
                      </strong>
                    </div>
                    <div className="flex items-center justify-between text-stone-600 dark:text-stone-400">
                      <span>Custo Total Estimado ({editPackagesCount} emb.):</span>
                      <strong className="text-amber-700 dark:text-amber-400 font-bold tabular-nums">
                        {formatCurrency(editPrice * editPackagesCount)}
                      </strong>
                    </div>
                  </div>

                  {editSuccessMsg && (
                    <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center gap-2 text-xs text-emerald-800 dark:text-emerald-300">
                      <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                      <span>{editSuccessMsg}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-100 dark:border-stone-800">
                  <button
                    type="button"
                    onClick={() => setEditingItem(null)}
                    className="px-4 py-2 text-xs font-semibold text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-xl transition-colors min-h-[40px]"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveItemEdit}
                    className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-xs transition-colors min-h-[40px]"
                  >
                    <Save className="w-4 h-4" />
                    <span>Salvar no Catálogo & Histórico</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================
          MODE 3: FORNADA INDIVIDUAL (MANUAL)
          ======================================================== */}
      {mode === 'manual' && currentRecipe && manualBatchResult && (
        <div className="space-y-6">
          {/* Production Setup Control Card */}
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Selecione o Bolo / Receita
                </label>
                <select
                  value={selectedRecipeId}
                  onChange={(e) => {
                    setSelectedRecipeId(e.target.value);
                    setSelectedSizeIndex(0);
                    setCheckedIngredients({});
                  }}
                  className="w-full px-3.5 py-2.5 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-xs sm:text-sm font-semibold text-stone-900 dark:text-stone-100 focus:bg-white dark:focus:bg-stone-800 focus:border-amber-500 dark:focus:border-amber-500 min-h-[44px]"
                >
                  {recipes.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name || 'Sem nome'} ({r.items?.length || 0} ing.)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Tamanho do Bolo
                </label>
                <select
                  value={currentSizeIndex}
                  onChange={(e) => {
                    setSelectedSizeIndex(parseInt(e.target.value, 10));
                    setCheckedIngredients({});
                  }}
                  className="w-full px-3.5 py-2.5 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-xs sm:text-sm font-semibold text-stone-900 dark:text-stone-100 focus:bg-white dark:focus:bg-stone-800 focus:border-amber-500 dark:focus:border-amber-500 min-h-[44px]"
                >
                  {sizes.map((sz, idx) => (
                    <option key={sz.id} value={idx}>
                      Tamanho {sz.nome} (Fator {sz.k}×)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Quantos Bolos Fazer?
                </label>
                <div className="flex items-center gap-2">
                  <NumericInput
                    value={cakeCount}
                    onChange={(val) => {
                      setCakeCount(val);
                      setCheckedIngredients({});
                    }}
                    placeholder="1"
                    min={0.1}
                    maxDecimals={1}
                    suffix="bolos"
                    className="px-3.5 py-2.5 bg-amber-50/60 dark:bg-stone-800 border border-amber-300 dark:border-stone-700 text-amber-900 dark:text-stone-100 rounded-xl text-sm font-bold tabular-nums focus:bg-white dark:focus:bg-stone-800 min-h-[44px]"
                  />
                </div>
              </div>
            </div>

            {/* Quick Batch Summary Banner */}
            <div className="p-3 bg-stone-50 dark:bg-stone-800/60 border border-stone-200/80 dark:border-stone-800 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs text-stone-700 dark:text-stone-300">
              <div className="flex items-center gap-2">
                <Cake className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <span>
                  Produção planejada:{' '}
                  <strong>
                    {formatNumber(safeCakeCount)} bolo(s) tamanho {selectedSize.nome}
                  </strong>
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-stone-600 dark:text-stone-400">
                  Fator total: <strong>{formatNumber(manualBatchResult.totalFactor, 2)}×</strong>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setShoppingSource('manual');
                    setMode('shopping');
                  }}
                  className="text-amber-700 dark:text-amber-400 hover:underline font-bold flex items-center gap-1"
                >
                  <ShoppingCart className="w-3.5 h-3.5" />
                  <span>Gerar Lista de Compras deste Bolo</span>
                </button>
              </div>
            </div>
          </div>

          {/* Production KPIs Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
            <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-3.5 sm:p-4 shadow-xs">
              <span className="text-[11px] sm:text-xs text-stone-500 dark:text-stone-400 block mb-0.5 sm:mb-1">
                Custo Total do Lote
              </span>
              <strong className="text-base sm:text-xl font-bold text-stone-900 dark:text-stone-100 tabular-nums font-display block">
                {formatCurrency(manualBatchResult.totalCost)}
              </strong>
              <span className="text-[10px] sm:text-[11px] text-stone-500 dark:text-stone-400 block mt-0.5">
                {formatCurrency(manualBatchResult.totalCost / safeCakeCount)} / bolo
              </span>
            </div>

            <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-3.5 sm:p-4 shadow-xs">
              <span className="text-[11px] sm:text-xs text-stone-500 dark:text-stone-400 block mb-0.5 sm:mb-1">
                Receita Estimada
              </span>
              <strong className="text-base sm:text-xl font-bold text-sky-700 dark:text-sky-400 tabular-nums font-display block">
                {formatCurrency(manualBatchResult.totalRevenue)}
              </strong>
              <span className="text-[10px] sm:text-[11px] text-stone-500 dark:text-stone-400 block mt-0.5">
                {formatCurrency(manualBatchResult.totalRevenue / safeCakeCount)} / bolo
              </span>
            </div>

            <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-3.5 sm:p-4 shadow-xs">
              <span className="text-[11px] sm:text-xs text-stone-500 dark:text-stone-400 block mb-0.5 sm:mb-1">
                Lucro Líquido
              </span>
              <strong
                className={`text-base sm:text-xl font-bold tabular-nums font-display block ${
                  manualBatchResult.totalProfit >= 0
                    ? 'text-emerald-700 dark:text-emerald-400'
                    : 'text-rose-700 dark:text-rose-400'
                }`}
              >
                {formatCurrency(manualBatchResult.totalProfit)}
              </strong>
              <span className="text-[10px] sm:text-[11px] text-stone-500 dark:text-stone-400 block mt-0.5">
                {formatCurrency(manualBatchResult.totalProfit / safeCakeCount)} / bolo
              </span>
            </div>

            <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-3.5 sm:p-4 shadow-xs">
              <span className="text-[11px] sm:text-xs text-stone-500 dark:text-stone-400 block mb-0.5 sm:mb-1">
                Margem Real
              </span>
              <strong
                className={`text-base sm:text-xl font-bold tabular-nums font-display block ${
                  manualBatchResult.totalProfit >= 0
                    ? 'text-emerald-700 dark:text-emerald-400'
                    : 'text-rose-700 dark:text-rose-400'
                }`}
              >
                {manualBatchResult.totalRevenue > 0
                  ? formatPercent(
                      (manualBatchResult.totalProfit / manualBatchResult.totalRevenue) * 100
                    )
                  : '0%'}
              </strong>
              <span className="text-[10px] sm:text-[11px] text-stone-500 dark:text-stone-400 block mt-0.5">
                Alvo: {currentRecipe.margin || cfg.margin}%
              </span>
            </div>
          </div>

          {/* Scaled Ingredients Checklist / Weighing */}
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <div className="flex items-center gap-2">
                <Scale className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                <h3 className="text-base font-bold text-stone-900 dark:text-stone-100 font-display">
                  Lista de Pesagem dos Ingredientes
                </h3>
              </div>
              <span className="text-xs text-stone-500 dark:text-stone-400">
                {Object.values(checkedIngredients).filter(Boolean).length} de{' '}
                {manualBatchResult.ingredients.length} separados
              </span>
            </div>

            <div className="border border-stone-200 dark:border-stone-800 rounded-xl overflow-hidden text-xs sm:text-sm">
              <table className="w-full text-left">
                <thead className="bg-stone-50 dark:bg-stone-800 border-b border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300">
                  <tr>
                    <th className="py-2.5 px-3 font-semibold w-12 text-center">Status</th>
                    <th className="py-2.5 px-3 font-semibold">Ingrediente</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Qtd a Pesar</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Custo Proporcional</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                  {manualBatchResult.ingredients.map((item, idx) => {
                    const isChecked = !!checkedIngredients[idx];

                    return (
                      <tr
                        key={idx}
                        onClick={() =>
                          setCheckedIngredients((prev) => ({
                            ...prev,
                            [idx]: !prev[idx],
                          }))
                        }
                        className={`cursor-pointer transition-colors ${
                          isChecked
                            ? 'bg-amber-50/40 dark:bg-amber-950/20 text-stone-400 dark:text-stone-500 line-through'
                            : 'hover:bg-stone-50 dark:hover:bg-stone-800/50'
                        }`}
                      >
                        <td className="py-2.5 px-3 text-center">
                          <button
                            type="button"
                            className="text-stone-400 hover:text-amber-700 dark:hover:text-amber-400 p-1 min-h-[36px] min-w-[36px] flex items-center justify-center mx-auto"
                          >
                            {isChecked ? (
                              <CheckSquare className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                            ) : (
                              <Square className="w-4 h-4 text-stone-300 dark:text-stone-600" />
                            )}
                          </button>
                        </td>
                        <td className="py-2.5 px-3 font-medium text-stone-900 dark:text-stone-100">
                          {item.name}
                          {!item.ing || item.ing.price <= 0 ? (
                            <span className="ml-2 text-[10px] text-rose-600 dark:text-rose-400 font-bold bg-rose-50 dark:bg-rose-950/50 px-1.5 py-0.5 rounded">
                              Sem preço
                            </span>
                          ) : null}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-amber-950 dark:text-amber-300 tabular-nums">
                          {(() => {
                            const isBanana = item.name.toLowerCase().includes('banana');
                            if (isBanana && item.unit === 'un') {
                              const gQty = item.scaledQty >= 15 ? item.scaledQty : Math.round(item.scaledQty * 120);
                              return `${formatNumber(gQty, 2)} g`;
                            }
                            return `${formatNumber(item.scaledQty, 2)} ${item.unit}`;
                          })()}
                        </td>
                        <td className="py-2.5 px-3 text-right text-stone-600 dark:text-stone-400 tabular-nums">
                          {formatCurrency(item.cost)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Utilities in manual batch */}
            <div className="p-3.5 bg-stone-50 dark:bg-stone-800/60 border border-stone-200/80 dark:border-stone-800 rounded-xl space-y-2 text-xs">
              <h4 className="font-semibold text-stone-700 dark:text-stone-300">
                Custos Operacionais do Lote:
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-stone-600 dark:text-stone-400">
                <div>
                  <span>Gás ({formatNumber((currentRecipe.time || 0) * manualBatchResult.totalFactor, 0)} min):</span>{' '}
                  <strong className="text-stone-900 dark:text-stone-100 tabular-nums">
                    {formatCurrency(manualBatchResult.gasCost)}
                  </strong>
                </div>
                <div>
                  <span>Energia Elétrica:</span>{' '}
                  <strong className="text-stone-900 dark:text-stone-100 tabular-nums">
                    {formatCurrency(manualBatchResult.elecCost)}
                  </strong>
                </div>
                <div>
                  <span>Embalagens ({formatNumber(safeCakeCount)} un):</span>{' '}
                  <strong className="text-stone-900 dark:text-stone-100 tabular-nums">
                    {formatCurrency(manualBatchResult.packCost)}
                  </strong>
                </div>
                <div>
                  <span>Outros Insumos:</span>{' '}
                  <strong className="text-stone-900 dark:text-stone-100 tabular-nums">
                    {formatCurrency(manualBatchResult.fuelCost)}
                  </strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Production Schedule Grid Preview & Print Modal */}
      {isPreviewGridOpen && (
        <ProductionGridPreviewModal
          isOpen={isPreviewGridOpen}
          onClose={() => setIsPreviewGridOpen(false)}
          orders={orders}
          recipes={recipes}
          onUpdateStatus={onUpdateStatus}
          onToast={onToast}
        />
      )}
    </div>
  );
};
