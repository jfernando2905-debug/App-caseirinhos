import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Plus,
  Trash2,
  Cake,
  Calendar,
  Clock,
  User,
  Phone,
  DollarSign,
  FileText,
  Sparkles,
  RotateCcw,
} from 'lucide-react';
import { Order, OrderItem, OrderStatus, Recipe, Ingredient, AppSettings, RecipeSize } from '../types';
import { CAKE_TYPES, CAKE_SIZES, CAKE_FLAVORS } from '../utils/orderShare';
import { NumericInput } from './NumericInput';
import { uid } from '../utils/storage';
import { calculateSizeMetrics, formatCurrency } from '../utils/calculations';

interface OrderFormModalProps {
  order: Order | null;
  recipes: Recipe[];
  ingredients?: Ingredient[];
  cfg?: AppSettings;
  isOpen: boolean;
  onClose: () => void;
  onSave: (order: Order) => void;
}

/**
 * Calculates the unit price for a recipe and size.
 * Uses manual selling price (size.sell or recipe.sell) or calculates from cost + target margin.
 */
export const getPriceForRecipeAndSize = (
  recipe: Recipe,
  sizeName?: string,
  cfgParam?: AppSettings,
  ingsParam?: Ingredient[]
): number => {
  if (!recipe) return 0;

  // 1. Check recipe sizes
  if (recipe.sizes && recipe.sizes.length > 0) {
    let matchedSize = sizeName
      ? recipe.sizes.find((s) => s.nome.toLowerCase().trim() === sizeName.toLowerCase().trim())
      : undefined;

    if (!matchedSize && sizeName) {
      matchedSize = recipe.sizes.find(
        (s) =>
          s.nome.toLowerCase().includes(sizeName.toLowerCase()) ||
          sizeName.toLowerCase().includes(s.nome.toLowerCase())
      );
    }

    const targetSize = matchedSize || recipe.sizes[0];
    if (targetSize && targetSize.sell > 0) {
      return targetSize.sell;
    }

    if (targetSize && cfgParam && ingsParam && ingsParam.length > 0) {
      try {
        const metrics = calculateSizeMetrics(recipe, targetSize, cfgParam, ingsParam);
        const effectivePrice = metrics.sellCakePrice > 0 ? metrics.sellCakePrice : metrics.suggestedCakePrice;
        if (effectivePrice > 0) {
          return Math.round(effectivePrice * 100) / 100;
        }
      } catch {
        // fallback
      }
    }
  }

  // 2. Base recipe sell price
  if (recipe.sell > 0) {
    return recipe.sell;
  }

  // 3. Fallback calculation if possible
  if (cfgParam && ingsParam && ingsParam.length > 0) {
    try {
      const defaultSize: RecipeSize = {
        id: 'default',
        nome: 'Padrão',
        k: 1,
        pack: recipe.pack || 0,
        sell: recipe.sell || 0,
      };
      const metrics = calculateSizeMetrics(recipe, defaultSize, cfgParam, ingsParam);
      const effectivePrice = metrics.sellCakePrice > 0 ? metrics.sellCakePrice : metrics.suggestedCakePrice;
      if (effectivePrice > 0) {
        return Math.round(effectivePrice * 100) / 100;
      }
    } catch {
      // fallback
    }
  }

  return 0;
};

export const OrderFormModal: React.FC<OrderFormModalProps> = ({
  order,
  recipes,
  ingredients = [],
  cfg,
  isOpen,
  onClose,
  onSave,
}) => {
  const isEditing = !!order;
  const todayStr = new Date().toISOString().slice(0, 10);

  const [cliente, setCliente] = useState<string>(order ? order.cliente : '');
  const [telefone, setTelefone] = useState<string>(order ? order.telefone || '' : '');
  const [entrega, setEntrega] = useState<string>(order ? order.entrega : todayStr);
  const [hora, setHora] = useState<string>(order ? order.hora || '' : '');
  const [valor, setValor] = useState<number>(order ? order.valor || 0 : 0);
  const [sinal, setSinal] = useState<number>(order ? order.sinal || 0 : 0);
  const [status, setStatus] = useState<OrderStatus>(order ? order.status : 'pendente');
  const [pago, setPago] = useState<boolean>(order ? !!order.pago : false);
  const [obs, setObs] = useState<string>(order ? order.obs || '' : '');
  const [itens, setItens] = useState<OrderItem[]>([]);
  const [errorMsg, setErrorMsg] = useState<string>('');

  // Helper to sum up items
  const calculateItemsSum = (itemsList: OrderItem[]): number => {
    return itemsList.reduce((acc, it) => {
      const q = Math.max(1, it.qtd || 1);
      const u = it.valorUnitario || 0;
      return acc + u * q;
    }, 0);
  };

  // Re-synchronize form state whenever the order to edit changes or modal opens
  useEffect(() => {
    if (order) {
      setCliente(order.cliente || '');
      setTelefone(order.telefone || '');
      setEntrega(order.entrega || todayStr);
      setHora(order.hora || '');
      setValor(order.valor || 0);
      setSinal(order.sinal || 0);
      setStatus(order.status || 'pendente');
      setPago(!!order.pago);
      setObs(order.obs || '');

      const initialItems: OrderItem[] =
        order.itens && order.itens.length > 0
          ? order.itens.map((it) => ({ ...it }))
          : [{ tipo: CAKE_TYPES[0], tamanho: CAKE_SIZES[3], sabor: CAKE_FLAVORS[0], qtd: 1 }];

      setItens(initialItems);
    } else {
      // New Order: default to first registered recipe with auto-pulled price if available
      setCliente('');
      setTelefone('');
      setEntrega(todayStr);
      setHora('');
      setSinal(0);
      setStatus('pendente');
      setPago(false);
      setObs('');

      let defaultItems: OrderItem[];
      if (recipes && recipes.length > 0) {
        const firstRec = recipes[0];
        const firstSize = firstRec.sizes && firstRec.sizes[0] ? firstRec.sizes[0].nome : 'Padrão';
        const price = getPriceForRecipeAndSize(firstRec, firstSize, cfg, ingredients);
        defaultItems = [
          {
            tipo: 'Bolo caseiro',
            tamanho: firstSize,
            sabor: firstRec.name,
            qtd: 1,
            receitaId: firstRec.id,
            valorUnitario: price > 0 ? price : undefined,
          },
        ];
      } else {
        defaultItems = [
          { tipo: CAKE_TYPES[0], tamanho: CAKE_SIZES[3], sabor: CAKE_FLAVORS[0], qtd: 1 },
        ];
      }

      setItens(defaultItems);
      const autoTotal = calculateItemsSum(defaultItems);
      setValor(autoTotal);
    }
    setErrorMsg('');
  }, [order, isOpen, todayStr, recipes, cfg, ingredients]);

  const itemsSum = useMemo(() => calculateItemsSum(itens), [itens]);

  if (!isOpen) return null;

  const handleUpdateItem = (index: number, changes: Partial<OrderItem>) => {
    const newItems = [...itens];
    newItems[index] = { ...newItems[index], ...changes };
    setItens(newItems);
  };

  const handleAddItem = () => {
    let newItem: OrderItem;
    if (recipes.length > 0) {
      const firstRec = recipes[0];
      const firstSize = firstRec.sizes && firstRec.sizes[0] ? firstRec.sizes[0].nome : 'Padrão';
      const price = getPriceForRecipeAndSize(firstRec, firstSize, cfg, ingredients);
      newItem = {
        tipo: 'Bolo caseiro',
        tamanho: firstSize,
        sabor: firstRec.name,
        qtd: 1,
        receitaId: firstRec.id,
        valorUnitario: price > 0 ? price : undefined,
      };
    } else {
      newItem = {
        tipo: CAKE_TYPES[0],
        tamanho: CAKE_SIZES[3],
        sabor: CAKE_FLAVORS[0],
        qtd: 1,
      };
    }

    const updated = [...itens, newItem];
    setItens(updated);
    const newSum = calculateItemsSum(updated);
    if (newSum > 0) {
      setValor(newSum);
    }
  };

  const handleRemoveItem = (index: number) => {
    if (itens.length <= 1) return;
    const newItems = [...itens];
    newItems.splice(index, 1);
    setItens(newItems);
    const newSum = calculateItemsSum(newItems);
    if (newSum > 0) {
      setValor(newSum);
    }
  };

  // 1. Select Recipe as Cake: auto-pulls cake name, size, unit price, and updates total
  const handleSelectRecipe = (index: number, recipeId: string) => {
    if (!recipeId) {
      // Switched to custom unlinked cake
      const updated = [...itens];
      updated[index] = {
        ...updated[index],
        receitaId: undefined,
      };
      setItens(updated);
      return;
    }

    const rec = recipes.find((r) => r.id === recipeId);
    if (!rec) return;

    const currentItem = itens[index];
    // Preserve current size if recipe supports it, otherwise default to recipe's first size
    let targetSize = currentItem.tamanho;
    const hasMatchingSize = rec.sizes?.some(
      (s) => s.nome.toLowerCase().trim() === (targetSize || '').toLowerCase().trim()
    );
    if (!hasMatchingSize) {
      targetSize = rec.sizes && rec.sizes[0] ? rec.sizes[0].nome : (currentItem.tamanho || 'Padrão');
    }

    const price = getPriceForRecipeAndSize(rec, targetSize, cfg, ingredients);

    const updated = [...itens];
    updated[index] = {
      ...updated[index],
      receitaId: rec.id,
      sabor: rec.name,
      tamanho: targetSize,
      valorUnitario: price > 0 ? price : updated[index].valorUnitario,
    };
    setItens(updated);

    const newSum = calculateItemsSum(updated);
    if (newSum > 0) {
      setValor(newSum);
    }
  };

  // 2. Change Cake Size: if linked to recipe, re-pulls that size's price automatically
  const handleChangeSize = (index: number, newSize: string) => {
    const currentItem = itens[index];
    let price = currentItem.valorUnitario;

    const rec =
      recipes.find((r) => r.id === currentItem.receitaId) ||
      recipes.find((r) => r.name.toLowerCase().trim() === currentItem.sabor.toLowerCase().trim());

    if (rec) {
      const sizePrice = getPriceForRecipeAndSize(rec, newSize, cfg, ingredients);
      if (sizePrice > 0) {
        price = sizePrice;
      }
    }

    const updated = [...itens];
    updated[index] = {
      ...updated[index],
      tamanho: newSize,
      valorUnitario: price,
    };
    setItens(updated);

    const newSum = calculateItemsSum(updated);
    if (newSum > 0) {
      setValor(newSum);
    }
  };

  // 3. Change Flavor: if matches a registered recipe, links it and pulls price
  const handleChangeFlavor = (index: number, newFlavor: string) => {
    const currentItem = itens[index];
    const matchedRec = recipes.find(
      (r) =>
        r.name.toLowerCase().trim() === newFlavor.toLowerCase().trim() ||
        r.name.toLowerCase().includes(newFlavor.toLowerCase()) ||
        newFlavor.toLowerCase().includes(r.name.toLowerCase())
    );

    let price = currentItem.valorUnitario;
    let recId = currentItem.receitaId;

    if (matchedRec) {
      recId = matchedRec.id;
      const sizePrice = getPriceForRecipeAndSize(matchedRec, currentItem.tamanho, cfg, ingredients);
      if (sizePrice > 0) {
        price = sizePrice;
      }
    }

    const updated = [...itens];
    updated[index] = {
      ...updated[index],
      sabor: newFlavor,
      receitaId: recId,
      valorUnitario: price,
    };
    setItens(updated);

    const newSum = calculateItemsSum(updated);
    if (newSum > 0) {
      setValor(newSum);
    }
  };

  // 4. Change Quantity
  const handleChangeQtd = (index: number, newQtd: number) => {
    const updated = [...itens];
    updated[index] = {
      ...updated[index],
      qtd: Math.max(1, newQtd),
    };
    setItens(updated);

    const newSum = calculateItemsSum(updated);
    if (newSum > 0) {
      setValor(newSum);
    }
  };

  // 5. Change Unit Price manually
  const handleChangeUnitPrice = (index: number, unitPrice: number) => {
    const updated = [...itens];
    updated[index] = {
      ...updated[index],
      valorUnitario: unitPrice,
    };
    setItens(updated);

    const newSum = calculateItemsSum(updated);
    if (newSum > 0) {
      setValor(newSum);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cliente.trim()) {
      setErrorMsg('Por favor informe o nome do cliente.');
      return;
    }
    if (!entrega) {
      setErrorMsg('Por favor informe a data de entrega.');
      return;
    }

    // Clean items
    const cleanedItems = itens.map((it) => ({
      tipo: it.tipo || CAKE_TYPES[0],
      tamanho: it.tamanho || CAKE_SIZES[0],
      sabor: it.sabor.trim() || 'Tradicional',
      qtd: Math.max(1, Number(it.qtd) || 1),
      receitaId: it.receitaId,
      valorUnitario: it.valorUnitario && it.valorUnitario > 0 ? it.valorUnitario : undefined,
    }));

    const savedOrder: Order = {
      id: order ? order.id : uid(),
      cliente: cliente.trim(),
      telefone: telefone.trim() || undefined,
      entrega,
      hora: hora || undefined,
      valor: valor > 0 ? valor : undefined,
      sinal: sinal > 0 ? sinal : undefined,
      status,
      pago,
      pagoEm: pago ? (order?.pagoEm || Date.now()) : undefined,
      obs: obs.trim() || undefined,
      itens: cleanedItems,
      criadoEm: order?.criadoEm || Date.now(),
    };

    onSave(savedOrder);
    onClose();
  };

  const restante = Math.max(valor - sinal, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 rounded-2xl max-w-xl w-full p-5 sm:p-6 shadow-2xl border border-stone-200 dark:border-stone-800 my-8 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-stone-100 dark:border-stone-800">
          <div>
            <h3 className="text-lg font-bold text-stone-900 dark:text-stone-100 font-display">
              {isEditing ? 'Editar Encomenda' : 'Nova Encomenda de Bolo'}
            </h3>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              Preencha os dados do cliente e selecione os bolos com preços automáticos
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl hover:bg-stone-100 dark:hover:bg-stone-800 flex items-center justify-center text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto py-4 space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-800 dark:text-rose-300 text-xs">
              {errorMsg}
            </div>
          )}

          {/* Cliente e Telefone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-stone-400" />
                <span>Cliente *</span>
              </label>
              <input
                type="text"
                value={cliente}
                onChange={(e) => setCliente(e.target.value)}
                placeholder="Nome completo do cliente"
                className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500 rounded-xl text-sm font-medium focus:bg-white dark:focus:bg-stone-800 focus:border-amber-500 transition-colors min-h-[42px]"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-stone-400" />
                <span>Telefone / WhatsApp</span>
              </label>
              <input
                type="tel"
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
                placeholder="(00) 00000-0000"
                className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500 rounded-xl text-sm font-medium focus:bg-white dark:focus:bg-stone-800 focus:border-amber-500 transition-colors min-h-[42px]"
              />
            </div>
          </div>

          {/* Bolos da Encomenda */}
          <div className="space-y-3 pt-2 border-t border-stone-100 dark:border-stone-800">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-stone-900 dark:text-stone-100 uppercase tracking-wider flex items-center gap-1.5">
                <Cake className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span>Bolos da Encomenda ({itens.length})</span>
              </label>
              {itemsSum > 0 && (
                <span className="text-xs font-bold text-amber-900 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 px-2.5 py-0.5 rounded-lg border border-amber-200 dark:border-amber-800">
                  Total bolos: {formatCurrency(itemsSum)}
                </span>
              )}
            </div>

            <div className="space-y-3.5">
              {itens.map((it, idx) => {
                const linkedRecipe =
                  recipes.find((r) => r.id === it.receitaId) ||
                  recipes.find((r) => r.name.toLowerCase().trim() === it.sabor.toLowerCase().trim());

                // Available sizes: prefer recipe's configured sizes if available, otherwise fallback to CAKE_SIZES
                const availableSizes: string[] =
                  linkedRecipe && linkedRecipe.sizes && linkedRecipe.sizes.length > 0
                    ? linkedRecipe.sizes.map((s) => s.nome)
                    : CAKE_SIZES;

                const isCustomFlavor =
                  !linkedRecipe && !CAKE_FLAVORS.includes(it.sabor) && it.sabor !== '';

                const subtotal = (it.valorUnitario || 0) * (it.qtd || 1);

                return (
                  <div
                    key={idx}
                    className="p-3.5 bg-stone-50 dark:bg-stone-800/50 border border-stone-200/90 dark:border-stone-700/80 rounded-2xl space-y-3 relative transition-all"
                  >
                    {/* Item Top Bar */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-amber-900 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/60 px-2 py-0.5 rounded-md">
                          Bolo #{idx + 1}
                        </span>
                        {linkedRecipe && (
                          <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                            <Sparkles className="w-2.5 h-2.5" />
                            <span>Preço automático</span>
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-stone-700 dark:text-stone-300 tabular-nums">
                          Subtotal: <strong className="text-amber-900 dark:text-amber-200">{formatCurrency(subtotal)}</strong>
                        </span>

                        {itens.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            className="text-stone-400 hover:text-rose-600 text-xs flex items-center gap-1 p-1 min-h-[32px] cursor-pointer"
                            title="Remover bolo"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Primary Cake / Recipe Selector */}
                    <div>
                      <label className="block text-xs font-bold text-stone-800 dark:text-stone-200 mb-1">
                        Selecione o Bolo *
                      </label>

                      {recipes.length > 0 ? (
                        <select
                          value={it.receitaId || (linkedRecipe ? linkedRecipe.id : '__custom')}
                          onChange={(e) => {
                            if (e.target.value === '__custom') {
                              handleSelectRecipe(idx, '');
                            } else {
                              handleSelectRecipe(idx, e.target.value);
                            }
                          }}
                          className="w-full px-3 py-2 bg-white dark:bg-stone-800 border-2 border-amber-300 dark:border-amber-700/80 text-stone-900 dark:text-stone-100 rounded-xl text-xs sm:text-sm font-semibold focus:border-amber-500 min-h-[42px] shadow-2xs"
                        >
                          <option value="" disabled>
                            Selecione um bolo cadastrado...
                          </option>
                          {recipes.map((r) => {
                            const samplePrice = getPriceForRecipeAndSize(r, it.tamanho, cfg, ingredients);
                            return (
                              <option key={r.id} value={r.id}>
                                🍰 {r.name} {samplePrice > 0 ? `— a partir de ${formatCurrency(samplePrice)}` : ''}
                              </option>
                            );
                          })}
                          <option value="__custom">✏️ Outro bolo / sabor personalizado...</option>
                        </select>
                      ) : (
                        <input
                          type="text"
                          value={it.sabor}
                          onChange={(e) => handleChangeFlavor(idx, e.target.value)}
                          placeholder="Digite o sabor do bolo..."
                          className="w-full px-3 py-2 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 rounded-xl text-xs sm:text-sm font-medium focus:border-amber-500 min-h-[40px]"
                        />
                      )}
                    </div>

                    {/* Custom Flavor Free Text (if custom chosen) */}
                    {(!linkedRecipe || isCustomFlavor) && (
                      <div>
                        <label className="block text-[11px] font-semibold text-stone-600 dark:text-stone-400 mb-0.5">
                          Sabor / Recheio Personalizado
                        </label>
                        <div className="space-y-1.5">
                          <select
                            value={isCustomFlavor ? '__outro' : it.sabor}
                            onChange={(e) => {
                              if (e.target.value === '__outro') {
                                handleChangeFlavor(idx, 'Outro sabor');
                              } else {
                                handleChangeFlavor(idx, e.target.value);
                              }
                            }}
                            className="w-full px-2.5 py-1.5 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 rounded-xl text-xs sm:text-sm font-medium focus:border-amber-500 min-h-[38px]"
                          >
                            <option value="">Selecione o sabor sugerido...</option>
                            {CAKE_FLAVORS.map((f) => (
                              <option key={f} value={f}>
                                {f}
                              </option>
                            ))}
                            <option value="__outro">Digitar sabor livremente...</option>
                          </select>

                          {isCustomFlavor && (
                            <input
                              type="text"
                              value={it.sabor === 'Outro sabor' ? '' : it.sabor}
                              onChange={(e) => handleChangeFlavor(idx, e.target.value)}
                              placeholder="Digite o sabor ou combinação..."
                              className="w-full px-2.5 py-1.5 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 rounded-lg text-xs font-medium focus:border-amber-500 min-h-[38px]"
                            />
                          )}
                        </div>
                      </div>
                    )}

                    {/* Tipo de Bolo e Tamanho */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-[11px] font-semibold text-stone-600 dark:text-stone-400 mb-0.5">
                          Tipo de Bolo
                        </label>
                        <select
                          value={it.tipo}
                          onChange={(e) => handleUpdateItem(idx, { tipo: e.target.value })}
                          className="w-full px-2.5 py-2 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 rounded-xl text-xs sm:text-sm font-medium focus:border-amber-500 min-h-[40px]"
                        >
                          {CAKE_TYPES.map((t) => (
                            <option key={t} value={t}>
                              {t}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-stone-600 dark:text-stone-400 mb-0.5 flex items-center justify-between">
                          <span>Tamanho</span>
                          {linkedRecipe && (
                            <span className="text-[10px] text-amber-700 dark:text-amber-400">
                              Altera preço
                            </span>
                          )}
                        </label>
                        <select
                          value={it.tamanho}
                          onChange={(e) => handleChangeSize(idx, e.target.value)}
                          className="w-full px-2.5 py-2 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 rounded-xl text-xs sm:text-sm font-medium focus:border-amber-500 min-h-[40px]"
                        >
                          {availableSizes.map((sz) => {
                            const szPrice = linkedRecipe
                              ? getPriceForRecipeAndSize(linkedRecipe, sz, cfg, ingredients)
                              : 0;
                            return (
                              <option key={sz} value={sz}>
                                {sz} {szPrice > 0 ? `(${formatCurrency(szPrice)})` : ''}
                              </option>
                            );
                          })}
                        </select>
                      </div>
                    </div>

                    {/* Quantidade, Preço Unitário e Subtotal */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1">
                      <div>
                        <label className="block text-[11px] font-semibold text-stone-600 dark:text-stone-400 mb-0.5">
                          Quantidade
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={it.qtd}
                          onChange={(e) =>
                            handleChangeQtd(idx, parseInt(e.target.value, 10) || 1)
                          }
                          className="w-full px-2.5 py-2 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 rounded-xl text-xs sm:text-sm font-bold text-center tabular-nums focus:border-amber-500 min-h-[40px]"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-stone-600 dark:text-stone-400 mb-0.5 flex items-center justify-between">
                          <span>Preço Unitário</span>
                          {it.valorUnitario && it.valorUnitario > 0 ? (
                            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                              Puxado ✓
                            </span>
                          ) : null}
                        </label>
                        <NumericInput
                          value={it.valorUnitario || 0}
                          onChange={(val) => handleChangeUnitPrice(idx, val)}
                          placeholder="0,00"
                          prefix="R$"
                          min={0}
                          className="px-2.5 py-2 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 rounded-xl text-xs sm:text-sm font-bold tabular-nums text-right focus:border-amber-500 min-h-[40px]"
                        />
                      </div>

                      <div className="col-span-2 sm:col-span-1 flex flex-col justify-end">
                        <div className="p-2 bg-amber-50/80 dark:bg-amber-950/40 rounded-xl border border-amber-200/80 dark:border-amber-800/60 text-right min-h-[40px] flex flex-col justify-center">
                          <span className="text-[10px] text-stone-500 dark:text-stone-400 leading-tight">
                            Subtotal ({it.qtd}×)
                          </span>
                          <strong className="text-sm font-black text-amber-900 dark:text-amber-200 tabular-nums">
                            {formatCurrency(subtotal)}
                          </strong>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              onClick={handleAddItem}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-amber-900 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/40 border border-amber-200 dark:border-amber-800 rounded-xl transition-colors min-h-[40px] cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Adicionar outro bolo na encomenda</span>
            </button>
          </div>

          {/* Data e Horário de Entrega */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-stone-100 dark:border-stone-800">
            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-stone-400" />
                <span>Data de Entrega *</span>
              </label>
              <input
                type="date"
                value={entrega}
                onChange={(e) => setEntrega(e.target.value)}
                className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 rounded-xl text-sm font-semibold tabular-nums focus:bg-white dark:focus:bg-stone-800 focus:border-amber-500 transition-colors min-h-[42px]"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-stone-400" />
                <span>Horário de Entrega</span>
              </label>
              <input
                type="time"
                value={hora}
                onChange={(e) => setHora(e.target.value)}
                className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 rounded-xl text-sm font-semibold tabular-nums focus:bg-white dark:focus:bg-stone-800 focus:border-amber-500 transition-colors min-h-[42px]"
              />
            </div>
          </div>

          {/* Valores: Valor Total e Sinal Pago */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5 text-stone-400" />
                  <span>Valor Total da Encomenda (R$)</span>
                </label>
                {itemsSum > 0 && Math.abs(valor - itemsSum) > 0.01 && (
                  <button
                    type="button"
                    onClick={() => setValor(itemsSum)}
                    className="text-[10px] font-bold text-amber-700 dark:text-amber-400 hover:underline flex items-center gap-1 cursor-pointer"
                    title="Usar soma calculada dos bolos"
                  >
                    <RotateCcw className="w-2.5 h-2.5" />
                    <span>Usar soma ({formatCurrency(itemsSum)})</span>
                  </button>
                )}
              </div>
              <NumericInput
                value={valor}
                onChange={(val) => setValor(val)}
                placeholder="0,00"
                prefix="R$"
                min={0}
                className="px-3 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 rounded-xl text-sm font-bold tabular-nums text-right focus:bg-white dark:focus:bg-stone-800 min-h-[42px]"
              />
              {itemsSum > 0 && (
                <span className="text-[11px] text-stone-500 dark:text-stone-400 block mt-1">
                  Soma dos bolos selecionados: <strong>{formatCurrency(itemsSum)}</strong>
                </span>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                Sinal Pago pelo Cliente (R$)
              </label>
              <NumericInput
                value={sinal}
                onChange={(val) => setSinal(val)}
                placeholder="0,00"
                prefix="R$"
                min={0}
                className="px-3 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 rounded-xl text-sm font-bold tabular-nums text-right focus:bg-white dark:focus:bg-stone-800 min-h-[42px]"
              />
              {sinal > 0 && valor > 0 && (
                <span className="text-[11px] text-stone-500 dark:text-stone-400 block mt-1">
                  Restante a pagar na entrega: <strong>{restante > 0 ? formatCurrency(restante) : 'Quitado'}</strong>
                </span>
              )}
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
              Status da Encomenda
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['pendente', 'pronto', 'entregue'] as OrderStatus[]).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatus(st)}
                  className={`py-2 px-3 text-xs font-bold rounded-xl border transition-all capitalize min-h-[40px] cursor-pointer ${
                    status === st
                      ? st === 'entregue'
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : st === 'pronto'
                        ? 'bg-sky-600 text-white border-sky-600'
                        : 'bg-amber-600 text-white border-amber-600'
                      : 'bg-stone-50 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-700'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {/* Situação do Pagamento */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
              Situação do Pagamento
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPago(false)}
                className={`py-2 px-3 text-xs font-semibold rounded-xl border transition-all flex items-center justify-center gap-1.5 min-h-[40px] cursor-pointer ${
                  !pago
                    ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 border-amber-300 dark:border-amber-700 font-bold shadow-2xs'
                    : 'bg-stone-50 dark:bg-stone-800 text-stone-600 dark:text-stone-400 border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-700'
                }`}
              >
                <span>⏳ A Receber ({restante > 0 ? formatCurrency(restante) : 'Pendente'})</span>
              </button>

              <button
                type="button"
                onClick={() => setPago(true)}
                className={`py-2 px-3 text-xs font-semibold rounded-xl border transition-all flex items-center justify-center gap-1.5 min-h-[40px] cursor-pointer ${
                  pago
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700 font-bold shadow-2xs'
                    : 'bg-stone-50 dark:bg-stone-800 text-stone-600 dark:text-stone-400 border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-700'
                }`}
              >
                <span>✅ Pago / Quitado</span>
              </button>
            </div>
          </div>

          {/* Observações */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-stone-400" />
              <span>Observações (tema, frase, alergias, endereço...)</span>
            </label>
            <textarea
              rows={3}
              value={obs}
              onChange={(e) => setObs(e.target.value)}
              placeholder="Ex.: Escrever 'Parabéns Maria', topo com laço rosa, cliente vem retirar às 16h..."
              className="w-full p-2.5 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500 focus:bg-white dark:focus:bg-stone-800 focus:border-amber-500 transition-colors text-xs sm:text-sm rounded-xl"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-stone-100 dark:border-stone-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-xl transition-colors min-h-[42px] cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-500 rounded-xl shadow-xs transition-all min-h-[42px] cursor-pointer"
            >
              {isEditing ? 'Salvar Alterações' : 'Criar Encomenda'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
