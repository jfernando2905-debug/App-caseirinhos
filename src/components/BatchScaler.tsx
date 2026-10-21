import React, { useState } from 'react';
import { Scale, Cake, ShoppingCart, CheckSquare, Square, Printer } from 'lucide-react';
import { Recipe, Ingredient, AppSettings } from '../types';
import { scaleBatch, formatCurrency, formatNumber, formatPercent } from '../utils/calculations';
import { NumericInput } from './NumericInput';

interface BatchScalerProps {
  recipes: Recipe[];
  ingredients: Ingredient[];
  cfg: AppSettings;
  initialRecipeId?: string;
  onOpenRecipe: (recipe: Recipe) => void;
}

export const BatchScaler: React.FC<BatchScalerProps> = ({
  recipes,
  ingredients,
  cfg,
  initialRecipeId,
}) => {
  const [selectedRecipeId, setSelectedRecipeId] = useState<string>(
    initialRecipeId || (recipes[0] ? recipes[0].id : '')
  );
  const [selectedSizeIndex, setSelectedSizeIndex] = useState<number>(0);
  const [cakeCount, setCakeCount] = useState<number>(3);
  const [checkedIngredients, setCheckedIngredients] = useState<Record<number, boolean>>({});

  const recipe = recipes.find((r) => r.id === selectedRecipeId) || recipes[0];

  if (!recipe) {
    return (
      <div className="bg-white border border-stone-200 rounded-2xl p-12 text-center shadow-xs">
        <Scale className="w-12 h-12 text-stone-300 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-stone-800 font-display">
          Nenhuma receita disponível para escalonar
        </h3>
        <p className="text-sm text-stone-500 mt-1">
          Crie ou carregue receitas primeiro para planejar suas fornadas.
        </p>
      </div>
    );
  }

  const sizes = recipe.sizes && recipe.sizes.length > 0
    ? recipe.sizes
    : [{ id: 'default', nome: 'Padrão', k: 1, pack: recipe.pack || 0, sell: recipe.sell || 0 }];

  const currentSizeIndex = Math.min(selectedSizeIndex, sizes.length - 1);
  const selectedSize = sizes[currentSizeIndex] || sizes[0];
  const safeCakeCount = Math.max(cakeCount || 1, 0.1);

  const batchResult = scaleBatch(recipe, selectedSize, safeCakeCount, cfg, ingredients);

  const toggleCheck = (idx: number) => {
    setCheckedIngredients((prev) => ({
      ...prev,
      [idx]: !prev[idx],
    }));
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-stone-900 font-display flex items-center gap-2">
            <Scale className="w-5 h-5 sm:w-6 sm:h-6 text-amber-600 shrink-0" />
            <span>Escalonar Produção & Fornada</span>
          </h2>
          <p className="text-xs sm:text-sm text-stone-600 mt-0.5">
            Calcule a quantidade exata de ingredientes e o lucro total para encomendas de múltiplos bolos.
          </p>
        </div>

        <button
          onClick={handlePrint}
          className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold text-stone-700 bg-white hover:bg-stone-50 border border-stone-200 rounded-xl shadow-xs transition-colors min-h-[40px] sm:min-h-[42px] no-print"
        >
          <Printer className="w-4 h-4 text-stone-600 shrink-0" />
          <span>Imprimir Ordem de Produção</span>
        </button>
      </div>

      {/* Production Setup Control Card */}
      <div className="bg-white border border-stone-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Selecione o Bolo / Receita
            </label>
            <select
              value={selectedRecipeId}
              onChange={(e) => {
                setSelectedRecipeId(e.target.value);
                setSelectedSizeIndex(0);
                setCheckedIngredients({});
              }}
              className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs sm:text-sm font-semibold text-stone-900 focus:bg-white focus:border-amber-500 min-h-[44px]"
            >
              {recipes.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name || 'Sem nome'} ({r.items?.length || 0} ing.)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Tamanho do Bolo
            </label>
            <select
              value={currentSizeIndex}
              onChange={(e) => {
                setSelectedSizeIndex(parseInt(e.target.value, 10));
                setCheckedIngredients({});
              }}
              className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs sm:text-sm font-semibold text-stone-900 focus:bg-white focus:border-amber-500 min-h-[44px]"
            >
              {sizes.map((sz, idx) => (
                <option key={sz.id} value={idx}>
                  Tamanho {sz.nome} (Fator {sz.k}×)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
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
                className="px-3.5 py-2.5 bg-amber-50/60 border border-amber-300 rounded-xl text-sm font-bold text-amber-900 tabular-nums focus:bg-white min-h-[44px]"
              />
            </div>
          </div>
        </div>

        {/* Quick Batch Summary Banner */}
        <div className="p-3 bg-stone-50 border border-stone-200/80 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs text-stone-700">
          <div className="flex items-center gap-2">
            <Cake className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              Produção planejada: <strong>{formatNumber(safeCakeCount)} bolo(s) tamanho {selectedSize.nome}</strong>
            </span>
          </div>
          <div className="text-stone-600">
            Fator multiplicador total: <strong>{formatNumber(batchResult.totalFactor, 2)}×</strong> · Total de fatias: <strong>{formatNumber(batchResult.totalSlices, 1)}</strong>
          </div>
        </div>
      </div>

      {/* Production KPIs Strip (Responsive 2x2 on mobile, 4 columns on desktop) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
        <div className="bg-white border border-stone-200 rounded-2xl p-3.5 sm:p-4 shadow-xs">
          <span className="text-[11px] sm:text-xs text-stone-500 block mb-0.5 sm:mb-1">Custo Total do Lote</span>
          <strong className="text-base sm:text-xl font-bold text-stone-900 tabular-nums font-display block">
            {formatCurrency(batchResult.totalCost)}
          </strong>
          <span className="text-[10px] sm:text-[11px] text-stone-500 block mt-0.5">
            {formatCurrency(batchResult.totalCost / safeCakeCount)} / bolo
          </span>
        </div>

        <div className="bg-white border border-stone-200 rounded-2xl p-3.5 sm:p-4 shadow-xs">
          <span className="text-[11px] sm:text-xs text-stone-500 block mb-0.5 sm:mb-1">Receita Estimada</span>
          <strong className="text-base sm:text-xl font-bold text-sky-700 tabular-nums font-display block">
            {formatCurrency(batchResult.totalRevenue)}
          </strong>
          <span className="text-[10px] sm:text-[11px] text-stone-500 block mt-0.5">
            {formatCurrency(batchResult.totalRevenue / safeCakeCount)} / bolo
          </span>
        </div>

        <div className="bg-white border border-stone-200 rounded-2xl p-3.5 sm:p-4 shadow-xs">
          <span className="text-[11px] sm:text-xs text-stone-500 block mb-0.5 sm:mb-1">Lucro Líquido</span>
          <strong
            className={`text-base sm:text-xl font-bold tabular-nums font-display block ${
              batchResult.totalProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'
            }`}
          >
            {formatCurrency(batchResult.totalProfit)}
          </strong>
          <span className="text-[10px] sm:text-[11px] text-stone-500 block mt-0.5">
            {formatCurrency(batchResult.totalProfit / safeCakeCount)} / bolo
          </span>
        </div>

        <div className="bg-white border border-stone-200 rounded-2xl p-3.5 sm:p-4 shadow-xs">
          <span className="text-[11px] sm:text-xs text-stone-500 block mb-0.5 sm:mb-1">Margem Real</span>
          <strong
            className={`text-base sm:text-xl font-bold tabular-nums font-display block ${
              batchResult.totalProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'
            }`}
          >
            {batchResult.totalRevenue > 0
              ? formatPercent((batchResult.totalProfit / batchResult.totalRevenue) * 100)
              : '0%'}
          </strong>
          <span className="text-[10px] sm:text-[11px] text-stone-500 block mt-0.5">
            Alvo: {recipe.margin || cfg.margin}%
          </span>
        </div>
      </div>

      {/* Scaled Ingredients Checklist / Shopping List */}
      <div className="bg-white border border-stone-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-amber-600" />
            <h3 className="text-base font-bold text-stone-900 font-display">
              Lista de Pesagem & Ingredientes do Lote
            </h3>
          </div>
          <span className="text-xs text-stone-500">
            {Object.values(checkedIngredients).filter(Boolean).length} de {batchResult.ingredients.length} separados
          </span>
        </div>

        <div className="border border-stone-200 rounded-xl overflow-hidden text-xs sm:text-sm">
          <table className="w-full text-left">
            <thead className="bg-stone-50 border-b border-stone-200 text-stone-600">
              <tr>
                <th className="py-2.5 px-3 font-semibold w-12 text-center">Status</th>
                <th className="py-2.5 px-3 font-semibold">Ingrediente</th>
                <th className="py-2.5 px-3 font-semibold text-right">Qtd a Pesar / Usar</th>
                <th className="py-2.5 px-3 font-semibold text-right">Custo Proporcional</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {batchResult.ingredients.map((item, idx) => {
                const isChecked = !!checkedIngredients[idx];

                return (
                  <tr
                    key={idx}
                    onClick={() => toggleCheck(idx)}
                    className={`cursor-pointer transition-colors ${
                      isChecked ? 'bg-amber-50/40 text-stone-400 line-through' : 'hover:bg-stone-50'
                    }`}
                  >
                    <td className="py-2.5 px-3 text-center">
                      <button
                        type="button"
                        className="text-stone-400 hover:text-amber-700 p-1 min-h-[36px] min-w-[36px] flex items-center justify-center mx-auto"
                      >
                        {isChecked ? (
                          <CheckSquare className="w-4 h-4 text-amber-600" />
                        ) : (
                          <Square className="w-4 h-4 text-stone-300" />
                        )}
                      </button>
                    </td>
                    <td className="py-2.5 px-3 font-medium text-stone-900">
                      {item.name}
                      {!item.ing || item.ing.price <= 0 ? (
                        <span className="ml-2 text-[10px] text-rose-600 font-bold bg-rose-50 px-1.5 py-0.5 rounded">
                          Sem preço
                        </span>
                      ) : null}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-amber-950 tabular-nums">
                      {formatNumber(item.scaledQty, 2)} {item.unit}
                    </td>
                    <td className="py-2.5 px-3 text-right text-stone-600 tabular-nums">
                      {formatCurrency(item.cost)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Utilities Cost in Batch */}
        <div className="p-3.5 bg-stone-50 border border-stone-200/80 rounded-xl space-y-2 text-xs">
          <h4 className="font-semibold text-stone-700">Custos Operacionais do Lote:</h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-stone-600">
            <div>
              <span>Gás ({formatNumber((recipe.time || 0) * batchResult.totalFactor, 0)} min):</span>{' '}
              <strong className="text-stone-900 tabular-nums">{formatCurrency(batchResult.gasCost)}</strong>
            </div>
            <div>
              <span>Energia Elétrica:</span>{' '}
              <strong className="text-stone-900 tabular-nums">{formatCurrency(batchResult.elecCost)}</strong>
            </div>
            <div>
              <span>Embalagens ({formatNumber(safeCakeCount)} un):</span>{' '}
              <strong className="text-stone-900 tabular-nums">{formatCurrency(batchResult.packCost)}</strong>
            </div>
            <div>
              <span>Outros Insumos:</span>{' '}
              <strong className="text-stone-900 tabular-nums">{formatCurrency(batchResult.fuelCost)}</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
