import React, { useState } from 'react';
import {
  Egg,
  Plus,
  Search,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  History,
  Trash2,
  Edit2,
  TrendingUp,
  TrendingDown,
  X,
  Boxes,
  FileText,
} from 'lucide-react';
import { Ingredient, Recipe, Unit } from '../types';
import { getPerLabel, formatCurrency, formatNumber } from '../utils/calculations';
import { uid } from '../utils/storage';
import {
  getIngredientStockStatus,
  getAllIngredientsStockStatus,
} from '../utils/stockUtils';
import { NumericInput } from './NumericInput';
import { LowStockSummaryModal } from './LowStockSummaryModal';

interface IngredientManagerProps {
  ingredients: Ingredient[];
  recipes: Recipe[];
  onSaveIngredient: (ingredient: Ingredient) => void;
  onDeleteIngredient: (id: string) => void;
  onToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
  onNavigateToScale?: () => void;
}

export const IngredientManager: React.FC<IngredientManagerProps> = ({
  ingredients,
  recipes,
  onSaveIngredient,
  onDeleteIngredient,
  onToast,
  onNavigateToScale,
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterMissingPrice, setFilterMissingPrice] = useState<boolean>(false);
  const [filterLowStock, setFilterLowStock] = useState<boolean>(false);
  const [selectedUnit, setSelectedUnit] = useState<string>('all');
  const [editingIngredient, setEditingIngredient] = useState<Ingredient | null>(null);
  const [isNew, setIsNew] = useState<boolean>(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [showLowStockModal, setShowLowStockModal] = useState<boolean>(false);

  // Form state inside modal
  const [formName, setFormName] = useState<string>('');
  const [formPrice, setFormPrice] = useState<number>(0);
  const [formSize, setFormSize] = useState<number>(1);
  const [formUnit, setFormUnit] = useState<Unit>('kg');
  const [formCategory, setFormCategory] = useState<string>('');
  const [formStock, setFormStock] = useState<number>(0);
  const [formMinStock, setFormMinStock] = useState<number>(0);
  const [formError, setFormError] = useState<string>('');

  // Stock status calculations across all ingredients
  const stockStatuses = getAllIngredientsStockStatus(ingredients, recipes);
  const zeroStockCount = stockStatuses.filter((s) => s.status === 'zero').length;
  const lowStockCount = stockStatuses.filter((s) => s.status === 'low').length;
  const totalAlertCount = zeroStockCount + lowStockCount;

  const openNewModal = () => {
    setIsNew(true);
    setFormName('');
    setFormPrice(0);
    setFormSize(1);
    setFormUnit('kg');
    setFormCategory('');
    setFormStock(0);
    setFormMinStock(0);
    setFormError('');
    setEditingIngredient({
      id: uid(),
      name: '',
      price: 0,
      size: 1,
      unit: 'kg',
      hist: [],
      stock: 0,
    });
  };

  const openEditModal = (ing: Ingredient) => {
    setIsNew(false);
    const isBanana = ing.name.toLowerCase().includes('banana');
    const safeUnit = isBanana && ing.unit === 'un' ? (ing.size > 10 ? 'g' : 'kg') : ing.unit;
    setFormName(ing.name);
    setFormPrice(ing.price || 0);
    setFormSize(ing.size || 1);
    setFormUnit(safeUnit);
    setFormCategory(ing.category || (isBanana ? 'Hortifrúti' : ''));
    setFormStock(typeof ing.stock === 'number' ? ing.stock : 0);
    setFormMinStock(typeof ing.minStock === 'number' ? ing.minStock : 0);
    setFormError('');
    setEditingIngredient(ing);
  };

  const handleSave = () => {
    if (!formName.trim()) {
      setFormError('Por favor informe o nome do ingrediente.');
      return;
    }

    if (formSize <= 0) {
      setFormError('O tamanho da embalagem deve ser maior que zero.');
      return;
    }

    const isBanana = formName.toLowerCase().includes('banana');
    let finalUnit = formUnit;
    if (isBanana && formUnit === 'un') {
      finalUnit = formSize > 10 ? 'g' : 'kg';
    }

    const currentHistory = editingIngredient?.hist ? [...editingIngredient.hist] : [];
    const lastHist = currentHistory[currentHistory.length - 1];

    // If price, size or unit changed, add to history
    if (
      !lastHist ||
      lastHist.price !== formPrice ||
      lastHist.size !== formSize ||
      lastHist.unit !== finalUnit
    ) {
      currentHistory.push({
        d: Date.now(),
        price: formPrice,
        size: formSize,
        unit: finalUnit,
      });
    }

    const updatedIng: Ingredient = {
      id: editingIngredient?.id || uid(),
      name: formName.trim(),
      price: Math.max(formPrice, 0),
      size: Math.max(formSize, 0.001),
      unit: finalUnit,
      hist: currentHistory,
      category: formCategory.trim() || (isBanana ? 'Hortifrúti' : undefined),
      stock: Math.max(formStock, 0),
      minStock: formMinStock > 0 ? formMinStock : undefined,
    };

    onSaveIngredient(updatedIng);
    setEditingIngredient(null);
  };

  const getStepForUnit = (unit: Unit): number => {
    switch (unit) {
      case 'kg':
        return 0.5;
      case 'g':
        return 100;
      case 'L':
        return 0.5;
      case 'ml':
        return 100;
      case 'un':
        return 1;
      default:
        return 1;
    }
  };

  const handleQuickAdjustStock = (e: React.MouseEvent, ing: Ingredient, delta: number) => {
    e.stopPropagation();
    const current = typeof ing.stock === 'number' ? ing.stock : 0;
    const nextVal = Math.max(0, Math.round((current + delta) * 1000) / 1000);
    onSaveIngredient({
      ...ing,
      stock: nextVal,
    });
    if (onToast) {
      onToast(
        `Estoque de "${ing.name}" atualizado: ${formatNumber(nextVal, ing.unit === 'g' || ing.unit === 'ml' ? 0 : 2)} ${ing.unit}`
      );
    }
  };

  // Filtered ingredients
  const filtered = ingredients
    .filter((ing) => {
      const matchSearch =
        ing.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (ing.category && ing.category.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchMissing = filterMissingPrice ? ing.price <= 0 : true;
      const matchUnit = selectedUnit === 'all' || ing.unit === selectedUnit;

      const stockInfo = getIngredientStockStatus(ing, recipes);
      const matchStock = filterLowStock
        ? stockInfo.status === 'zero' || stockInfo.status === 'low'
        : true;

      return matchSearch && matchMissing && matchUnit && matchStock;
    })
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));

  const missingPricesCount = ingredients.filter((i) => i.price <= 0).length;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-stone-900 dark:text-stone-100 font-display">
            Catálogo de Ingredientes
          </h2>
          <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-400 mt-0.5">
            Cadastre os preços pagos nas embalagens e controle o estoque necessário para suas receitas.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* New Low Stock Report Button */}
          <button
            onClick={() => setShowLowStockModal(true)}
            className={`flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl transition-all shadow-xs min-h-[40px] sm:min-h-[42px] cursor-pointer ${
              totalAlertCount > 0
                ? 'bg-amber-100 hover:bg-amber-200 text-amber-950 dark:bg-amber-950/80 dark:hover:bg-amber-900/80 dark:text-amber-200 border border-amber-300 dark:border-amber-700'
                : 'bg-stone-100 hover:bg-stone-200 text-stone-700 dark:bg-stone-800 dark:hover:bg-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700'
            }`}
            title="Gerar resumo em texto do estoque baixo baseado no uso em receitas"
          >
            {totalAlertCount > 0 ? (
              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            ) : (
              <Boxes className="w-4 h-4 text-stone-500 dark:text-stone-400 shrink-0" />
            )}
            <span>Resumo de Estoque</span>
            {totalAlertCount > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-extrabold bg-amber-600 text-white dark:bg-amber-500 dark:text-stone-950">
                {totalAlertCount}
              </span>
            )}
          </button>

          <button
            onClick={openNewModal}
            className="flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-500 rounded-xl shadow-xs transition-all active:scale-[0.98] min-h-[40px] sm:min-h-[42px] cursor-pointer"
          >
            <Plus className="w-4 h-4 shrink-0" />
            <span>Novo Ingrediente</span>
          </button>
        </div>
      </div>

      {/* Alert Banner for Low / Zero Stock */}
      {totalAlertCount > 0 && !filterLowStock && (
        <div className="p-3.5 sm:p-4 bg-amber-50/90 dark:bg-amber-950/40 border border-amber-300/80 dark:border-amber-800/80 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-2xs animate-fade-in">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-200/80 dark:bg-amber-900/60 flex items-center justify-center text-amber-800 dark:text-amber-300 shrink-0">
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="font-bold text-amber-950 dark:text-amber-200 text-sm">
                Alerta de Reposição: {totalAlertCount} {totalAlertCount === 1 ? 'ingrediente está' : 'ingredientes estão'} com estoque baixo ou zerado
              </p>
              <p className="text-amber-800/90 dark:text-amber-400/90 text-xs mt-0.5">
                {zeroStockCount > 0 && <span>🚨 {zeroStockCount} zerado(s) </span>}
                {lowStockCount > 0 && <span>⚠️ {lowStockCount} abaixo da quantidade necessária para as receitas</span>}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setFilterLowStock(true)}
              className="px-3 py-1.5 bg-amber-200 hover:bg-amber-300/80 dark:bg-amber-900/70 dark:hover:bg-amber-900 text-amber-950 dark:text-amber-100 rounded-xl font-bold transition-colors cursor-pointer text-xs"
            >
              Filtrar na Lista
            </button>
            <button
              onClick={() => setShowLowStockModal(true)}
              className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-bold transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer text-xs"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Ver Resumo em Texto</span>
            </button>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-4 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 dark:text-stone-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nome do ingrediente ou categoria..."
              className="w-full pl-9 pr-8 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500 rounded-xl text-sm focus:bg-white dark:focus:bg-stone-800 focus:border-amber-500 dark:focus:border-amber-500 transition-colors min-h-[42px]"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedUnit}
              onChange={(e) => setSelectedUnit(e.target.value)}
              className="px-3 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 rounded-xl text-xs font-medium focus:bg-white dark:focus:bg-stone-800 min-h-[42px]"
            >
              <option value="all">Todas Unidades</option>
              <option value="kg">kg (Quilograma)</option>
              <option value="g">g (Grama)</option>
              <option value="L">L (Litro)</option>
              <option value="ml">ml (Mililitro)</option>
              <option value="un">un (Unidade)</option>
            </select>

            {/* Low Stock Filter Button */}
            <button
              onClick={() => setFilterLowStock(!filterLowStock)}
              className={`px-3 py-2 text-xs font-semibold rounded-xl border transition-colors whitespace-nowrap min-h-[42px] flex items-center gap-1.5 cursor-pointer ${
                filterLowStock
                  ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-200 border-amber-300 dark:border-amber-700 font-bold'
                  : 'bg-stone-50 dark:bg-stone-800 text-stone-600 dark:text-stone-300 border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-700'
              }`}
              title="Filtrar ingredientes com estoque zerado ou baixo"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span>Estoque Baixo ({totalAlertCount})</span>
            </button>

            <button
              onClick={() => setFilterMissingPrice(!filterMissingPrice)}
              className={`px-3 py-2 text-xs font-semibold rounded-xl border transition-colors whitespace-nowrap min-h-[42px] flex items-center gap-1.5 cursor-pointer ${
                filterMissingPrice
                  ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-900 dark:text-rose-300 border-rose-300 dark:border-rose-900 font-bold'
                  : 'bg-stone-50 dark:bg-stone-800 text-stone-600 dark:text-stone-300 border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-700'
              }`}
            >
              <AlertCircle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
              <span>Sem Preço ({missingPricesCount})</span>
            </button>
          </div>
        </div>
      </div>

      {/* Ingredients List Cards */}
      {filtered.length === 0 ? (
        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-8 text-center shadow-xs">
          <Egg className="w-10 h-10 text-stone-300 dark:text-stone-600 mx-auto mb-2" />
          <p className="text-sm font-semibold text-stone-700 dark:text-stone-300">Nenhum ingrediente encontrado</p>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
            {searchTerm || filterMissingPrice || filterLowStock
              ? 'Tente ajustar os filtros ou termo de busca acima.'
              : 'Cadastre seu primeiro ingrediente para começar a calcular suas receitas.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((ing) => {
            const usedInCount = recipes.filter((r) =>
              (r.items || []).some((it) => it.ing === ing.id)
            ).length;
            const hasNoPrice = ing.price <= 0;
            const historyCount = ing.hist?.length || 0;
            const stockInfo = getIngredientStockStatus(ing, recipes);

            return (
              <div
                key={ing.id}
                onClick={() => openEditModal(ing)}
                className={`bg-white dark:bg-stone-900 border rounded-2xl p-4 shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group ${
                  hasNoPrice
                    ? 'border-rose-300 dark:border-rose-800/80 bg-rose-50/20 dark:bg-rose-950/20'
                    : stockInfo.status === 'zero'
                    ? 'border-rose-300/90 dark:border-rose-800/70 bg-rose-50/15 dark:bg-rose-950/20 hover:border-rose-400'
                    : stockInfo.status === 'low'
                    ? 'border-amber-300/90 dark:border-amber-800/70 bg-amber-50/15 dark:bg-amber-950/20 hover:border-amber-400'
                    : 'border-stone-200 dark:border-stone-800 hover:border-amber-400 dark:hover:border-amber-500/60'
                }`}
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="min-w-0 flex-1">
                      {ing.category && (
                        <span className="text-[10px] font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider block mb-0.5 truncate">
                          {ing.category}
                        </span>
                      )}
                      <h3 className="text-base font-bold text-stone-900 dark:text-stone-100 font-display group-hover:text-amber-700 dark:group-hover:text-amber-400 transition-colors truncate">
                        {ing.name}
                      </h3>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {/* Stock Alert Badge */}
                      {stockInfo.status === 'zero' ? (
                        <span
                          className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300 dark:border-rose-800 shrink-0"
                          title="Estoque zerado! Reposição necessária para produzir bolos."
                        >
                          <AlertCircle className="w-3 h-3 text-rose-600 dark:text-rose-400" />
                          <span>ZERADO</span>
                        </span>
                      ) : stockInfo.status === 'low' ? (
                        <span
                          className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800 shrink-0"
                          title={`Estoque abaixo do necessário (${formatNumber(stockInfo.minStock, 2)} ${ing.unit})`}
                        >
                          <AlertTriangle className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                          <span>BAIXO</span>
                        </span>
                      ) : (
                        <span
                          className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 shrink-0"
                          title="Estoque suficiente para as receitas cadastradas"
                        >
                          <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                          <span>OK</span>
                        </span>
                      )}

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditModal(ing);
                        }}
                        className="w-8 h-8 rounded-lg bg-stone-50 dark:bg-stone-800 group-hover:bg-amber-100 dark:group-hover:bg-amber-900/40 flex items-center justify-center text-stone-400 group-hover:text-amber-700 dark:group-hover:text-amber-300 transition-colors min-h-[36px] min-w-[36px]"
                        title="Editar ingrediente"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Financial & Package Info */}
                  <div className="space-y-1 my-2.5">
                    <div className="flex justify-between items-baseline text-xs">
                      <span className="text-stone-500 dark:text-stone-400">Preço pago:</span>
                      <strong className={`tabular-nums ${hasNoPrice ? 'text-rose-600 dark:text-rose-400' : 'text-stone-900 dark:text-stone-100 text-sm'}`}>
                        {hasNoPrice ? '⚠ R$ 0,00' : formatCurrency(ing.price)}
                      </strong>
                    </div>

                    <div className="flex justify-between items-baseline text-xs">
                      <span className="text-stone-500 dark:text-stone-400">Embalagem:</span>
                      <span className="text-stone-700 dark:text-stone-300 tabular-nums">
                        {formatNumber(ing.size, 2)} {ing.unit}
                      </span>
                    </div>

                    <div className="flex justify-between items-baseline text-xs pt-1 border-t border-stone-100 dark:border-stone-800 font-medium">
                      <span className="text-stone-500 dark:text-stone-400">Custo base:</span>
                      <strong className="text-amber-800 dark:text-amber-400 tabular-nums">
                        {hasNoPrice ? 'Preço não definido' : getPerLabel(ing)}
                      </strong>
                    </div>
                  </div>

                  {/* Direct Stock Level & Quick Adjustment Controls */}
                  <div className="pt-2.5 pb-1 border-t border-stone-100 dark:border-stone-800/80">
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="font-semibold text-stone-700 dark:text-stone-300 flex items-center gap-1">
                        <Boxes className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                        <span>Em Estoque:</span>
                      </span>

                      <div
                        className="flex items-center gap-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={(e) => handleQuickAdjustStock(e, ing, -getStepForUnit(ing.unit))}
                          disabled={(ing.stock ?? 0) <= 0}
                          className="w-6 h-6 rounded-md bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 disabled:opacity-30 text-stone-700 dark:text-stone-300 flex items-center justify-center font-bold text-xs transition-colors cursor-pointer"
                          title={`Diminuir -${getStepForUnit(ing.unit)} ${ing.unit}`}
                        >
                          -
                        </button>

                        <span
                          className={`px-2 py-0.5 text-xs font-black tabular-nums rounded-md ${
                            stockInfo.status === 'zero'
                              ? 'text-rose-700 dark:text-rose-400 bg-rose-100/70 dark:bg-rose-950/60'
                              : stockInfo.status === 'low'
                              ? 'text-amber-800 dark:text-amber-300 bg-amber-100/70 dark:bg-amber-950/60'
                              : 'text-stone-900 dark:text-stone-100 bg-stone-100 dark:bg-stone-800'
                          }`}
                        >
                          {formatNumber(stockInfo.currentStock, ing.unit === 'g' || ing.unit === 'ml' ? 0 : 2)} {ing.unit}
                        </span>

                        <button
                          type="button"
                          onClick={(e) => handleQuickAdjustStock(e, ing, getStepForUnit(ing.unit))}
                          className="w-6 h-6 rounded-md bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 flex items-center justify-center font-bold text-xs transition-colors cursor-pointer"
                          title={`Adicionar +${getStepForUnit(ing.unit)} ${ing.unit}`}
                        >
                          +
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-stone-500 dark:text-stone-400">
                      <span>Mínimo receitas: {formatNumber(stockInfo.minStock, ing.unit === 'g' || ing.unit === 'ml' ? 0 : 2)} {ing.unit}</span>
                      {stockInfo.deficit > 0 && (
                        <span className="text-rose-600 dark:text-rose-400 font-bold tabular-nums">
                          Falta: {formatNumber(stockInfo.deficit, ing.unit === 'g' || ing.unit === 'ml' ? 0 : 2)} {ing.unit}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Footer Info */}
                <div className="pt-2 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between text-[11px] text-stone-400 dark:text-stone-500 mt-2">
                  <span>
                    {usedInCount === 0
                      ? 'Não usado em receitas'
                      : `Usado em ${usedInCount} receita(s)`}
                  </span>
                  {historyCount > 1 && (
                    <span className="flex items-center gap-1 text-stone-500 dark:text-stone-400">
                      <History className="w-3 h-3" />
                      {historyCount} preços
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit / New Ingredient Modal */}
      {editingIngredient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-stone-200 dark:border-stone-800 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100 dark:border-stone-800 mb-4">
              <h3 className="text-lg font-bold text-stone-900 dark:text-stone-100 font-display">
                {isNew ? 'Novo Ingrediente' : 'Editar Ingrediente'}
              </h3>
              <button
                onClick={() => setEditingIngredient(null)}
                className="w-8 h-8 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 flex items-center justify-center text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 min-h-[38px] min-w-[38px]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 mb-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-800 dark:text-rose-300 text-xs">
                {formError}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Nome do Ingrediente *
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFormName(val);
                    if (val.toLowerCase().includes('banana')) {
                      if (formUnit === 'un') setFormUnit('kg');
                      if (!formCategory) setFormCategory('Hortifrúti');
                    }
                  }}
                  placeholder="Ex: Farinha de trigo especial"
                  className="w-full px-3.5 py-2.5 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500 rounded-xl text-sm font-medium focus:bg-white dark:focus:bg-stone-800 focus:border-amber-500 transition-colors min-h-[44px]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Categoria (opcional)
                </label>
                <input
                  type="text"
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  placeholder="Ex: Secos, Laticínios, Confeitaria, Hortifrúti"
                  className="w-full px-3.5 py-2.5 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500 rounded-xl text-sm font-medium focus:bg-white dark:focus:bg-stone-800 focus:border-amber-500 transition-colors min-h-[44px]"
                />
              </div>

              {/* Price, Packaging Size & Unit */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                    Preço pago (R$) *
                  </label>
                  <NumericInput
                    value={formPrice}
                    onChange={(val) => setFormPrice(val)}
                    placeholder="0,00"
                    prefix="R$"
                    min={0}
                    className="px-3 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 rounded-xl text-sm font-bold tabular-nums text-right focus:bg-white dark:focus:bg-stone-800 min-h-[42px]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                    Tamanho embalagem *
                  </label>
                  <NumericInput
                    value={formSize}
                    onChange={(val) => setFormSize(val)}
                    placeholder="1"
                    min={0.001}
                    maxDecimals={3}
                    className="px-3 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 rounded-xl text-sm font-semibold tabular-nums text-right focus:bg-white dark:focus:bg-stone-800 min-h-[42px]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                    Unidade de compra *
                  </label>
                  <select
                    value={formUnit}
                    onChange={(e) => setFormUnit(e.target.value as Unit)}
                    className="w-full px-2.5 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 rounded-xl text-sm font-medium focus:bg-white dark:focus:bg-stone-800 focus:border-amber-500 min-h-[42px]"
                  >
                    <option value="g">g (grama)</option>
                    <option value="kg">kg (quilo)</option>
                    <option value="ml">ml (mililitro)</option>
                    <option value="L">L (litro)</option>
                    <option value="un">un (unidade)</option>
                  </select>
                </div>
              </div>

              {/* Stock Management Fields */}
              <div className="p-3.5 bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/60 rounded-2xl space-y-3">
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-950 dark:text-amber-200">
                  <Boxes className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  <span>Controle de Estoque & Reposição</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                      Quantidade Atual em Estoque ({formUnit})
                    </label>
                    <NumericInput
                      value={formStock}
                      onChange={(val) => setFormStock(val)}
                      placeholder="0"
                      min={0}
                      maxDecimals={3}
                      className="px-3 py-2 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 rounded-xl text-sm font-bold tabular-nums text-right focus:border-amber-500 min-h-[42px]"
                    />
                    <span className="text-[11px] text-stone-500 dark:text-stone-400 block mt-1">
                      Você pode alterar diretamente no card com os botões + e -.
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                      Estoque Mínimo Desejado ({formUnit})
                    </label>
                    <NumericInput
                      value={formMinStock}
                      onChange={(val) => setFormMinStock(val)}
                      placeholder="0"
                      min={0}
                      maxDecimals={3}
                      className="px-3 py-2 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 rounded-xl text-sm font-bold tabular-nums text-right focus:border-amber-500 min-h-[42px]"
                    />
                    <span className="text-[11px] text-stone-500 dark:text-stone-400 block mt-1">
                      Se deixar 0, o sistema usa o consumo máximo das receitas.
                    </span>
                  </div>
                </div>
              </div>

              {/* Price History Table */}
              {!isNew && editingIngredient.hist && editingIngredient.hist.length > 0 && (
                <div className="mt-4 pt-4 border-t border-stone-100 dark:border-stone-800">
                  <h4 className="text-xs font-bold text-stone-800 dark:text-stone-200 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <History className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                    <span>Histórico de Preços e Variação</span>
                  </h4>

                  <div className="border border-stone-200 dark:border-stone-700 rounded-xl overflow-hidden text-xs max-h-44 overflow-y-auto">
                    <table className="w-full text-left">
                      <thead className="bg-stone-50 dark:bg-stone-800 border-b border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400">
                        <tr>
                          <th className="py-2 px-3 font-semibold">Data</th>
                          <th className="py-2 px-3 font-semibold text-right">Preço / Emb.</th>
                          <th className="py-2 px-3 font-semibold text-right">Variação</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                        {[...editingIngredient.hist].reverse().map((h, hIdx, arr) => {
                          const prev = arr[hIdx + 1];
                          const diff = prev && prev.price > 0 ? ((h.price / prev.price) - 1) * 100 : null;

                          return (
                            <tr key={hIdx}>
                              <td className="py-1.5 px-3 text-stone-600 dark:text-stone-400">
                                {new Date(h.d).toLocaleDateString('pt-BR')}
                              </td>
                              <td className="py-1.5 px-3 text-right font-medium text-stone-900 dark:text-stone-100 tabular-nums">
                                {formatCurrency(h.price)} / {formatNumber(h.size, 2)} {h.unit}
                              </td>
                              <td className="py-1.5 px-3 text-right tabular-nums">
                                {diff === null ? (
                                  <span className="text-stone-400">—</span>
                                ) : diff > 0.05 ? (
                                  <span className="text-rose-600 font-semibold flex items-center justify-end gap-0.5">
                                    <TrendingUp className="w-3 h-3" />
                                    +{formatNumber(diff, 1)}%
                                  </span>
                                ) : diff < -0.05 ? (
                                  <span className="text-emerald-600 font-semibold flex items-center justify-end gap-0.5">
                                    <TrendingDown className="w-3 h-3" />
                                    {formatNumber(diff, 1)}%
                                  </span>
                                ) : (
                                  <span className="text-stone-500">0,0%</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between gap-3 mt-6 pt-4 border-t border-stone-100 dark:border-stone-800">
              <div>
                {!isNew && (
                  <button
                    onClick={() => {
                      setDeleteConfirmId(editingIngredient.id);
                    }}
                    className="px-3 py-2 text-xs font-semibold text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors min-h-[42px] flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Excluir</span>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setEditingIngredient(null)}
                  className="px-4 py-2 text-xs font-semibold text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-xl transition-colors min-h-[42px] cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSave}
                  className="px-5 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-500 rounded-xl transition-colors min-h-[42px] cursor-pointer"
                >
                  Salvar Ingrediente
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 rounded-2xl max-w-sm w-full p-6 shadow-xl border border-stone-200 dark:border-stone-800">
            <h3 className="text-lg font-bold text-stone-900 dark:text-stone-100 font-display">Excluir Ingrediente?</h3>
            {(() => {
              const usedIn = recipes.filter((r) =>
                (r.items || []).some((it) => it.ing === deleteConfirmId)
              );
              return (
                <div className="mt-2 text-sm text-stone-600 dark:text-stone-300 space-y-2">
                  <p>
                    Tem certeza que deseja apagar este ingrediente do catálogo?
                  </p>
                  {usedIn.length > 0 && (
                    <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 text-amber-900 dark:text-amber-300 text-xs font-medium">
                      ⚠ Este ingrediente está sendo usado em <strong>{usedIn.length} receita(s)</strong> (ex:{' '}
                      {usedIn.map((r) => r.name).join(', ')}). Ao excluir, ele será removido dessas receitas!
                    </div>
                  )}
                </div>
              );
            })()}
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 text-xs font-semibold text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-xl min-h-[42px] cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  onDeleteIngredient(deleteConfirmId);
                  setDeleteConfirmId(null);
                  if (editingIngredient && editingIngredient.id === deleteConfirmId) {
                    setEditingIngredient(null);
                  }
                }}
                className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl min-h-[42px] cursor-pointer"
              >
                Confirmar Exclusão
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Low Stock Summary Report Modal */}
      <LowStockSummaryModal
        isOpen={showLowStockModal}
        onClose={() => setShowLowStockModal(false)}
        ingredients={ingredients}
        recipes={recipes}
        onToast={onToast}
        onNavigateToScale={onNavigateToScale}
      />
    </div>
  );
};
