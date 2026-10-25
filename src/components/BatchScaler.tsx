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
} from 'lucide-react';
import { Recipe, Ingredient, AppSettings, Order, Unit } from '../types';
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

interface BatchScalerProps {
  recipes: Recipe[];
  ingredients: Ingredient[];
  orders?: Order[];
  cfg: AppSettings;
  initialRecipeId?: string;
  onOpenRecipe: (recipe: Recipe) => void;
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
  ing?: Ingredient;
  usedIn: { recipeName: string; count: number }[];
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
        totalPackCost += Math.max(matchedSize.pack || rec.pack || 0, 0) * qty;
        totalFuelCost += Math.max(rec.fuel || 0, 0) * itemFactor;

        // Aggregate ingredients
        for (const rItem of rec.items || []) {
          const ing = ingredients.find((i) => i.id === rItem.ing);
          const ingId = rItem.ing || (ing ? ing.id : `unknown-${rItem.ing}`);
          const ingName = ing ? ing.name : 'Ingrediente Desconhecido';
          const ingCategory = ing?.category || 'Geral';
          const unitFactor = UNIT_FACTORS[rItem.unit] || 1;
          const baseUnit = UNIT_BASE[rItem.unit] || 'g';
          const addedBaseQty = (rItem.qty || 0) * itemFactor * unitFactor;

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

        // Commercial packages needed
        let packagesNeeded = 1;
        let packageCost = 0;
        let surplusBase = 0;

        if (data.ing && data.ing.size > 0) {
          const packFactor = UNIT_FACTORS[data.ing.unit] || 1;
          const packBaseSize = data.ing.size * packFactor;
          if (packBaseSize > 0) {
            packagesNeeded = Math.ceil(data.baseQty / packBaseSize);
            packageCost = packagesNeeded * (data.ing.price || 0);
            surplusBase = packagesNeeded * packBaseSize - data.baseQty;
          }
        } else {
          packageCost = proportionalCost;
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
          ing: data.ing,
          usedIn: usedInArray,
        };
      }
    );

    // Sort by category then name
    aggregatedIngsList.sort((a, b) => {
      if (a.category !== b.category) {
        return (a.category || '').localeCompare(b.category || '');
      }
      return a.name.localeCompare(b.name);
    });

    const totalIngCost = aggregatedIngsList.reduce((sum, i) => sum + i.proportionalCost, 0);
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
  }, [filteredOpenOrders, activeOrderSelection, recipes, ingredients, cfg]);

  // Shopping list data source: open orders or manual batch
  const shoppingItems = useMemo((): AggregatedIngredient[] => {
    if (shoppingSource === 'orders') {
      return aggregatedIngredients;
    }

    if (!manualBatchResult) return [];

    return manualBatchResult.ingredients.map((item, idx) => {
      const ing = item.ing;
      const baseUnit = UNIT_BASE[item.unit] || 'g';
      const factor = UNIT_FACTORS[item.unit] || 1;
      const baseQty = item.scaledQty * factor;
      const proportionalCost = item.cost;

      let packagesNeeded = 1;
      let packageCost = 0;
      let surplusBase = 0;

      if (ing && ing.size > 0) {
        const packFactor = UNIT_FACTORS[ing.unit] || 1;
        const packBaseSize = ing.size * packFactor;
        if (packBaseSize > 0) {
          packagesNeeded = Math.ceil(baseQty / packBaseSize);
          packageCost = packagesNeeded * (ing.price || 0);
          surplusBase = packagesNeeded * packBaseSize - baseQty;
        }
      } else {
        packageCost = proportionalCost;
      }

      return {
        id: ing?.id || `manual-${idx}`,
        name: item.name,
        category: ing?.category || 'Geral',
        baseQty,
        baseUnit,
        proportionalCost,
        packagesNeeded,
        packageCost,
        surplusBase,
        ing,
        usedIn: [{ recipeName: manualBatchResult.recipe.name, count: safeCakeCount }],
      };
    });
  }, [shoppingSource, aggregatedIngredients, manualBatchResult, safeCakeCount]);

  // Format base quantities into friendly strings (e.g., 2,4 kg (2.400 g))
  const formatFriendlyQty = (baseQty: number, baseUnit: 'g' | 'ml' | 'un') => {
    if (baseUnit === 'g') {
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

  // Filter shopping items by category
  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const item of shoppingItems) {
      if (item.category) set.add(item.category);
    }
    return Array.from(set).sort();
  }, [shoppingItems]);

  const filteredShoppingItems = useMemo(() => {
    if (categoryFilter === 'all') return shoppingItems;
    return shoppingItems.filter((i) => i.category === categoryFilter);
  }, [shoppingItems, categoryFilter]);

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
        const friendlyQty = formatFriendlyQty(item.baseQty, item.baseUnit);
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
              <button
                type="button"
                onClick={() => {
                  setShoppingSource('orders');
                  setMode('shopping');
                }}
                className="flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-xs transition-colors"
              >
                <ShoppingCart className="w-3.5 h-3.5" />
                <span>Ver Lista de Compras deste Lote</span>
              </button>
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
                          {formatFriendlyQty(item.baseQty, item.baseUnit)}
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
              {/* Category Filter */}
              <div className="flex items-center gap-2">
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
                              className={`text-sm font-semibold ${
                                isChecked
                                  ? 'text-stone-500 dark:text-stone-400 line-through'
                                  : 'text-stone-900 dark:text-stone-100'
                              }`}
                            >
                              {item.name}
                            </strong>
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-stone-100 dark:bg-stone-700 text-stone-600 dark:text-stone-300">
                              {item.category || 'Geral'}
                            </span>
                          </div>

                          <div className="text-xs text-stone-500 dark:text-stone-400 mt-1 flex items-center gap-2 flex-wrap">
                            <span>
                              Necessário na receita: <strong>{formatFriendlyQty(item.baseQty, item.baseUnit)}</strong>
                            </span>
                            {item.surplusBase > 0 && hasPackInfo && (
                              <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">
                                (Sobra estimada: {formatFriendlyQty(item.surplusBase, item.baseUnit)})
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right: Package Calculation & Cost */}
                      <div className="flex items-center justify-between sm:justify-end gap-4 pl-8 sm:pl-0">
                        {hasPackInfo ? (
                          <div className="text-left sm:text-right">
                            <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-300">
                              <Package className="w-3.5 h-3.5" />
                              Comprar {item.packagesNeeded}× ({item.ing?.size} {item.ing?.unit})
                            </span>
                            <span className="block text-[11px] text-stone-500 dark:text-stone-400 mt-0.5 tabular-nums">
                              {formatCurrency(item.packageCost)} no total
                            </span>
                          </div>
                        ) : (
                          <div className="text-left sm:text-right">
                            <span className="text-xs font-bold text-stone-700 dark:text-stone-300">
                              {formatFriendlyQty(item.baseQty, item.baseUnit)}
                            </span>
                            <span className="block text-[11px] text-stone-500 dark:text-stone-400 mt-0.5 tabular-nums">
                              {formatCurrency(item.proportionalCost)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
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
                          {formatNumber(item.scaledQty, 2)} {item.unit}
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
    </div>
  );
};
