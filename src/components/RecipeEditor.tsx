import React, { useState } from 'react';
import {
  ArrowLeft,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Zap,
  Flame,
  Layers,
  Scale,
  Printer,
  FileDown,
} from 'lucide-react';
import { Recipe, Ingredient, AppSettings, RecipeItem, RecipeSize, Equipment, Unit } from '../types';
import {
  calculateSizeMetrics,
  calculateGasCost,
  calculateElectricityCost,
  getItemCost,
  getHeatFactor,
  getCompatibleUnits,
  formatCurrency,
  formatNumber,
  formatPercent,
  scaleBatch,
} from '../utils/calculations';
import { generateRecipePdf } from '../utils/recipePdf';
import { uid } from '../utils/storage';
import { NumericInput } from './NumericInput';

interface RecipeEditorProps {
  recipe: Recipe;
  ingredients: Ingredient[];
  cfg: AppSettings;
  onUpdateRecipe: (updated: Recipe) => void;
  onDeleteRecipe: (id: string) => void;
  onBack: () => void;
  onOpenNewIngredientModal: () => void;
  onPrintRecipe: (recipe: Recipe) => void;
}

export const RecipeEditor: React.FC<RecipeEditorProps> = ({
  recipe,
  ingredients,
  cfg,
  onUpdateRecipe,
  onDeleteRecipe,
  onBack,
  onOpenNewIngredientModal,
  onPrintRecipe,
}) => {
  const [ingOpen, setIngOpen] = useState<boolean>(cfg.ingOpen !== false);
  const [scaleSizeIndex, setScaleSizeIndex] = useState<number>(0);
  const [scaleCakeCount, setScaleCakeCount] = useState<number>(1);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false);

  // Update recipe field helper
  const updateField = <K extends keyof Recipe>(field: K, value: Recipe[K]) => {
    onUpdateRecipe({
      ...recipe,
      [field]: value,
    });
  };

  // Ingredients operations
  const handleAddItem = () => {
    const firstIng = ingredients[0];
    const newItem: RecipeItem = {
      ing: firstIng ? firstIng.id : '',
      qty: 100,
      unit: firstIng ? firstIng.unit : 'g',
    };
    updateField('items', [...(recipe.items || []), newItem]);
  };

  const handleUpdateItem = (index: number, changes: Partial<RecipeItem>) => {
    const newItems = [...(recipe.items || [])];
    const current = newItems[index];

    // If changing ingredient, adapt unit to compatible
    if (changes.ing && changes.ing !== current.ing) {
      const selectedIng = ingredients.find((i) => i.id === changes.ing);
      if (selectedIng) {
        changes.unit = selectedIng.unit;
      }
    }

    newItems[index] = { ...current, ...changes };
    updateField('items', newItems);
  };

  const handleRemoveItem = (index: number) => {
    const newItems = [...(recipe.items || [])];
    newItems.splice(index, 1);
    updateField('items', newItems);
  };

  // Equipment operations
  const handleAddEquip = () => {
    const newEquip: Equipment = { nome: 'Liquidificador', w: 600, min: 3 };
    updateField('equip', [...(recipe.equip || []), newEquip]);
  };

  const handleUpdateEquip = (index: number, changes: Partial<Equipment>) => {
    const newEquip = [...(recipe.equip || [])];
    newEquip[index] = { ...newEquip[index], ...changes };
    updateField('equip', newEquip);
  };

  const handleRemoveEquip = (index: number) => {
    const newEquip = [...(recipe.equip || [])];
    newEquip.splice(index, 1);
    updateField('equip', newEquip);
  };

  // Size operations
  const sizes = recipe.sizes && recipe.sizes.length > 0
    ? recipe.sizes
    : [{ id: uid(), nome: 'P', k: 1, pack: recipe.pack || 0, sell: recipe.sell || 0 }];

  const handleAddSize = () => {
    const labels = ['P', 'M', 'G', 'GG', 'Festa', 'Bento', 'Mini'];
    const nextLabel = labels[sizes.length] || `Tam ${sizes.length + 1}`;
    const newSize: RecipeSize = {
      id: uid(),
      nome: nextLabel,
      k: sizes.length === 1 ? 1.6 : 2.0,
      pack: recipe.pack || 3.0,
      sell: 0,
    };
    updateField('sizes', [...sizes, newSize]);
  };

  const handleUpdateSize = (index: number, changes: Partial<RecipeSize>) => {
    const newSizes = [...sizes];
    newSizes[index] = { ...newSizes[index], ...changes };
    updateField('sizes', newSizes);
  };

  const handleRemoveSize = (index: number) => {
    if (sizes.length <= 1) return;
    const newSizes = [...sizes];
    newSizes.splice(index, 1);
    updateField('sizes', newSizes);
  };

  // Missing prices check
  const missingPrices = (recipe.items || []).filter((it) => {
    const ing = ingredients.find((i) => i.id === it.ing);
    return !ing || ing.price <= 0;
  });

  const totalBaseIngrCost = (recipe.items || []).reduce(
    (sum, it) => sum + getItemCost(it, ingredients),
    0
  );

  const heat = getHeatFactor(recipe.temp);
  const baseGas = calculateGasCost(recipe, cfg);
  const baseElec = calculateElectricityCost(recipe, cfg);

  // Batch scaler for current recipe
  const selectedSizeForScale = sizes[scaleSizeIndex] || sizes[0];
  const cakeCountNum = Math.max(scaleCakeCount || 1, 0.1);
  const scaleResult = scaleBatch(recipe, selectedSizeForScale, cakeCountNum, cfg, ingredients);

  return (
    <div className="space-y-6 pb-12">
      {/* Top Bar Navigation & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-stone-200/80 rounded-2xl p-4 shadow-xs">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="w-10 h-10 rounded-xl bg-stone-100 hover:bg-stone-200 flex items-center justify-center text-stone-700 transition-colors shrink-0 min-h-[44px] min-w-[44px]"
            title="Voltar para a lista de receitas"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/60">
                Editor de Receita
              </span>
              <span className="text-xs text-stone-500">
                {sizes.length} tamanho(s)
              </span>
            </div>
            <h2 className="text-xl font-bold text-stone-900 font-display">
              {recipe.name || 'Nova Receita'}
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            onClick={() => generateRecipePdf(recipe, ingredients, cfg)}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-xl transition-colors min-h-[42px]"
            title="Baixar ficha técnica completa em PDF"
          >
            <FileDown className="w-4 h-4 text-amber-600" />
            <span className="hidden sm:inline">Baixar PDF</span>
          </button>

          <button
            onClick={() => onPrintRecipe(recipe)}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-xl transition-colors min-h-[42px]"
            title="Visualizar e Imprimir ficha de produção"
          >
            <Printer className="w-4 h-4 text-stone-600" />
            <span className="hidden sm:inline">Imprimir Ficha</span>
          </button>

          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200/80 rounded-xl transition-colors min-h-[42px]"
            title="Excluir receita"
          >
            <Trash2 className="w-4 h-4" />
            <span className="hidden sm:inline">Excluir</span>
          </button>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl border border-stone-200">
            <h3 className="text-lg font-bold text-stone-900 font-display">Excluir Receita?</h3>
            <p className="text-sm text-stone-600 mt-2">
              Tem certeza que deseja apagar a receita <strong>"{recipe.name || 'Sem nome'}"</strong>? Esta ação não pode ser desfeita.
            </p>
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-xl min-h-[44px]"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  onDeleteRecipe(recipe.id);
                }}
                className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl min-h-[44px]"
              >
                Confirmar Exclusão
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Basic Parameters Card */}
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
        <h3 className="text-base font-bold text-stone-900 dark:text-stone-100 font-display flex items-center gap-2">
          <span>Informações da Receita Base</span>
          <span className="text-xs font-normal text-stone-500 dark:text-stone-400">(Fator 1)</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
              Nome do Bolo ou Receita
            </label>
            <input
              type="text"
              value={recipe.name}
              onChange={(e) => updateField('name', e.target.value)}
              placeholder="Ex: Bolo de Cenoura com Chocolate"
              className="w-full px-3.5 py-2.5 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500 rounded-xl text-sm font-medium focus:bg-white dark:focus:bg-stone-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors min-h-[44px]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
              Categoria (opcional)
            </label>
            <input
              type="text"
              value={recipe.category || ''}
              onChange={(e) => updateField('category', e.target.value)}
              placeholder="Ex: Bolos Tradicionais, Festas, Cremosos"
              className="w-full px-3.5 py-2.5 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500 rounded-xl text-sm font-medium focus:bg-white dark:focus:bg-stone-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors min-h-[44px]"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
              Rendimento base (fatias)
            </label>
            <NumericInput
              value={recipe.yield}
              onChange={(val) => updateField('yield', val)}
              placeholder="12"
              allowDecimals={false}
              min={1}
              className="px-3 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 rounded-xl text-sm font-semibold tabular-nums focus:bg-white dark:focus:bg-stone-800 min-h-[42px]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
              Margem desejada (%)
            </label>
            <NumericInput
              value={recipe.margin}
              onChange={(val) => updateField('margin', val)}
              placeholder="60"
              suffix="%"
              min={0}
              max={95}
              className="px-3 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 rounded-xl text-sm font-semibold tabular-nums focus:bg-white dark:focus:bg-stone-800 min-h-[42px]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
              Tempo de forno (min)
            </label>
            <NumericInput
              value={recipe.time}
              onChange={(val) => updateField('time', val)}
              placeholder="40"
              allowDecimals={false}
              suffix="min"
              min={0}
              className="px-3 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 rounded-xl text-sm font-semibold tabular-nums focus:bg-white dark:focus:bg-stone-800 min-h-[42px]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
              Outros custos base (R$)
            </label>
            <NumericInput
              value={recipe.fuel}
              onChange={(val) => updateField('fuel', val)}
              placeholder="0,50"
              prefix="R$"
              min={0}
              className="px-3 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 rounded-xl text-sm font-semibold tabular-nums focus:bg-white dark:focus:bg-stone-800 min-h-[42px]"
            />
          </div>
        </div>

        <div>
          <div className="flex flex-wrap items-center justify-between gap-1 mb-1">
            <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300">
              Temperatura do Forno (°C)
            </label>
            {heat.label && (
              <span className="text-[11px] font-medium text-orange-700 dark:text-orange-300 bg-orange-50 dark:bg-orange-950/40 px-2 py-0.5 rounded border border-orange-200/60 dark:border-orange-900/60">
                Forno {heat.label} (multiplicador de gás: ×{heat.m})
              </span>
            )}
          </div>
          <input
            type="text"
            value={recipe.temp || ''}
            onChange={(e) => updateField('temp', e.target.value)}
            placeholder="Ex: 180 ou 180-200"
            className="w-full px-3.5 py-2.5 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500 rounded-xl text-sm font-medium focus:bg-white dark:focus:bg-stone-800 focus:border-amber-500 transition-colors min-h-[44px]"
          />
          <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-1">
            Cálculo de gás: &lt;160°C usa ×0,8 (baixa), 160–210°C usa ×1,0 (média), &gt;210°C usa ×1,25 (alta).
          </p>
        </div>
      </div>

      {/* Ingredients Section (Collapsible) */}
      <div className="bg-white border border-stone-200 rounded-2xl p-4 sm:p-5 shadow-xs">
        <div
          onClick={() => setIngOpen(!ingOpen)}
          className="flex items-center justify-between cursor-pointer select-none group min-h-[44px]"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold text-sm shrink-0">
              🥚
            </div>
            <div>
              <h3 className="text-base font-bold text-stone-900 font-display group-hover:text-amber-700 transition-colors">
                Ingredientes (Receita Base)
              </h3>
              <p className="text-xs text-stone-500">
                {recipe.items?.length || 0} ingredientes cadastrados · Total:{' '}
                <strong className="text-amber-800 tabular-nums">{formatCurrency(totalBaseIngrCost)}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              className="text-stone-400 group-hover:text-stone-700 transition-colors p-1"
            >
              {ingOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Warning if any ingredient has price <= 0 */}
        {missingPrices.length > 0 && (
          <div className="mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>
                <strong>Atenção:</strong> {missingPrices.length} ingrediente(s) nesta receita estão com preço R$ 0,00. O custo total ficará incorreto até preencher.
              </span>
            </div>
            <button
              onClick={onOpenNewIngredientModal}
              className="px-3 py-1.5 text-xs font-semibold text-rose-900 bg-rose-200/70 hover:bg-rose-200 rounded-lg self-start sm:self-auto min-h-[36px]"
            >
              Editar Ingredientes
            </button>
          </div>
        )}

        {ingOpen && (
          <div className="mt-4 space-y-3 pt-4 border-t border-stone-100">
            {(!recipe.items || recipe.items.length === 0) ? (
              <div className="text-center py-6 text-stone-500 text-sm">
                Nenhum ingrediente adicionado à receita base ainda.
              </div>
            ) : (
              recipe.items.map((it, idx) => {
                const currentIng = ingredients.find((i) => i.id === it.ing);
                const itemTotalCost = getItemCost(it, ingredients);
                const compatibleUnits = currentIng ? getCompatibleUnits(currentIng.unit) : ['g', 'kg'];

                return (
                  <div
                    key={idx}
                    className="p-3 bg-stone-50 dark:bg-stone-800/50 border border-stone-200/70 dark:border-stone-700/80 rounded-xl flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5"
                  >
                    {/* Ingredient Select */}
                    <div className="flex-1 min-w-0">
                      <select
                        value={it.ing}
                        onChange={(e) => handleUpdateItem(idx, { ing: e.target.value })}
                        className="w-full px-3 py-2 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 rounded-lg text-xs sm:text-sm font-medium focus:border-amber-500 min-h-[42px]"
                      >
                        <option value="">Selecione um ingrediente...</option>
                        {ingredients.map((ing) => (
                          <option key={ing.id} value={ing.id}>
                            {ing.name} ({formatCurrency(ing.price)} / {formatNumber(ing.size)} {ing.unit})
                            {ing.price <= 0 ? ' ⚠ SEM PREÇO' : ''}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Quantity, Unit, Cost and Delete */}
                    <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0">
                      <div className="w-24">
                        <NumericInput
                          value={it.qty}
                          onChange={(val) => handleUpdateItem(idx, { qty: val })}
                          placeholder="Qtd"
                          min={0}
                          maxDecimals={2}
                          className="px-2.5 py-2 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 rounded-lg text-xs sm:text-sm font-semibold tabular-nums text-right min-h-[42px]"
                        />
                      </div>

                      <select
                        value={it.unit}
                        onChange={(e) => handleUpdateItem(idx, { unit: e.target.value as Unit })}
                        className="w-18 px-2 py-2 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 rounded-lg text-xs sm:text-sm font-medium focus:border-amber-500 min-h-[42px]"
                      >
                        {compatibleUnits.map((u) => (
                          <option key={u} value={u}>
                            {u}
                          </option>
                        ))}
                      </select>

                      <div className="text-right min-w-[75px] pl-1">
                        <span className="text-xs sm:text-sm font-bold text-stone-800 tabular-nums">
                          {formatCurrency(itemTotalCost)}
                        </span>
                      </div>

                      <button
                        onClick={() => handleRemoveItem(idx)}
                        className="w-9 h-9 rounded-lg hover:bg-rose-100 flex items-center justify-center text-stone-400 hover:text-rose-600 transition-colors shrink-0 min-h-[40px] min-w-[40px]"
                        title="Remover ingrediente da receita"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}

            <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
              <button
                onClick={handleAddItem}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-stone-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl transition-colors min-h-[42px]"
              >
                <Plus className="w-4 h-4 text-amber-700" />
                <span>Adicionar Ingrediente</span>
              </button>

              <button
                onClick={onOpenNewIngredientModal}
                className="text-xs text-amber-800 hover:underline font-medium min-h-[40px] flex items-center"
              >
                + Criar novo ingrediente no catálogo
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Electricity Section (Energia Elétrica) */}
      <div className="bg-white border border-stone-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center font-bold text-sm shrink-0">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-stone-900 font-display">
                Energia Elétrica (Equipamentos)
              </h3>
              <p className="text-xs text-stone-500">
                Tarifa configurada: <strong>{formatCurrency(cfg.elecPrice)}/kWh</strong> · Custo nesta receita:{' '}
                <strong className="text-stone-800 tabular-nums">{formatCurrency(baseElec)}</strong>
              </p>
            </div>
          </div>

          <button
            onClick={handleAddEquip}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-sky-800 bg-sky-50 hover:bg-sky-100 border border-sky-200 rounded-lg transition-colors self-start sm:self-auto min-h-[38px]"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Equipamento</span>
          </button>
        </div>

        {(!recipe.equip || recipe.equip.length === 0) ? (
          <div className="text-xs text-stone-500 italic p-3 bg-stone-50 rounded-xl">
            Nenhum equipamento elétrico adicionado. Toque no botão acima para adicionar liquidificador, batedeira, etc.
          </div>
        ) : (
          <div className="space-y-2">
            {recipe.equip.map((eq, idx) => (
              <div
                key={idx}
                className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 p-2.5 bg-stone-50 dark:bg-stone-800/50 border border-stone-200/80 dark:border-stone-700/80 rounded-xl"
              >
                <div className="flex-1">
                  <input
                    type="text"
                    value={eq.nome}
                    onChange={(e) => handleUpdateEquip(idx, { nome: e.target.value })}
                    placeholder="Equipamento (ex: Liquidificador)"
                    className="w-full px-2.5 py-1.5 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500 rounded-lg text-xs font-medium min-h-[38px]"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <div className="w-24">
                    <NumericInput
                      value={eq.w}
                      onChange={(val) => handleUpdateEquip(idx, { w: val })}
                      placeholder="W"
                      allowDecimals={false}
                      suffix="W"
                      min={0}
                      className="px-2 py-1.5 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 rounded-lg text-xs font-semibold tabular-nums text-right min-h-[38px]"
                    />
                  </div>

                  <div className="w-24">
                    <NumericInput
                      value={eq.min}
                      onChange={(val) => handleUpdateEquip(idx, { min: val })}
                      placeholder="min"
                      allowDecimals={false}
                      suffix="min"
                      min={0}
                      className="px-2 py-1.5 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 rounded-lg text-xs font-semibold tabular-nums text-right min-h-[38px]"
                    />
                  </div>

                  <button
                    onClick={() => handleRemoveEquip(idx)}
                    className="w-8 h-8 rounded-lg hover:bg-rose-100 flex items-center justify-center text-stone-400 hover:text-rose-600 transition-colors shrink-0 min-h-[38px] min-w-[38px]"
                    title="Remover equipamento"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Sizes Section (Tamanhos e Precificação) */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-lg font-bold text-stone-900 font-display flex items-center gap-2">
              <Layers className="w-5 h-5 text-amber-600" />
              <span>Tamanhos & Precificação Completa</span>
            </h3>
            <p className="text-xs text-stone-600">
              A receita base é o fator 1 (ex: Bolo P). Fator 1,6 ou 2,0 escala ingredientes, gás e fatias proporcionalmente. Embalagem e preço são do bolo inteiro.
            </p>
          </div>

          <button
            onClick={handleAddSize}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-500 rounded-xl transition-all self-start sm:self-auto min-h-[42px]"
          >
            <Plus className="w-4 h-4" />
            <span>Adicionar Tamanho</span>
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {sizes.map((sz, idx) => {
            const metrics = calculateSizeMetrics(recipe, sz, cfg, ingredients);
            const hasSell = sz.sell > 0;
            const isProfitGood = metrics.cakeProfit >= 0;

            return (
              <div
                key={sz.id}
                className="bg-white border border-stone-200 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col justify-between"
              >
                <div>
                  {/* Size Config Header */}
                  <div className="flex items-center justify-between gap-2 mb-3 pb-3 border-b border-stone-100">
                    <div className="flex items-center gap-2">
                      <span className="w-7 h-7 rounded-lg bg-amber-100 text-amber-900 font-bold text-xs flex items-center justify-center shrink-0">
                        {sz.nome.charAt(0)}
                      </span>
                      <input
                        type="text"
                        value={sz.nome}
                        onChange={(e) => handleUpdateSize(idx, { nome: e.target.value })}
                        placeholder="Nome (ex: P, M, 20cm)"
                        className="px-2.5 py-1.5 bg-stone-50 border border-stone-200 rounded-lg text-sm font-bold text-stone-900 focus:bg-white w-36 min-h-[38px]"
                      />
                    </div>

                    {sizes.length > 1 && (
                      <button
                        onClick={() => handleRemoveSize(idx)}
                        className="text-stone-400 hover:text-rose-600 text-xs flex items-center gap-1 p-1 min-h-[38px]"
                        title="Remover este tamanho"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Remover</span>
                      </button>
                    )}
                  </div>

                  {/* Size Config Inputs (Responsive Grid) */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                    <div>
                      <label className="block text-[11px] font-semibold text-stone-600 mb-0.5">
                        Fator da receita
                      </label>
                      <NumericInput
                        value={sz.k}
                        onChange={(val) => handleUpdateSize(idx, { k: val })}
                        placeholder="1,0"
                        min={0.1}
                        maxDecimals={2}
                        className="px-2.5 py-1.5 bg-stone-50 border border-stone-200 rounded-lg text-xs font-semibold tabular-nums text-right focus:bg-white min-h-[38px]"
                      />
                      <span className="text-[10px] text-stone-400 block mt-0.5">1 = base, 2 = dobro</span>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-stone-600 mb-0.5">
                        Embalagem do bolo
                      </label>
                      <NumericInput
                        value={sz.pack}
                        onChange={(val) => handleUpdateSize(idx, { pack: val })}
                        placeholder="3,00"
                        prefix="R$"
                        min={0}
                        className="px-2.5 py-1.5 bg-stone-50 border border-stone-200 rounded-lg text-xs font-semibold tabular-nums text-right focus:bg-white min-h-[38px]"
                      />
                      <span className="text-[10px] text-stone-400 block mt-0.5">Por bolo inteiro</span>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-amber-800 mb-0.5">
                        Seu Preço de Venda
                      </label>
                      <NumericInput
                        value={sz.sell}
                        onChange={(val) => handleUpdateSize(idx, { sell: val })}
                        placeholder="0,00"
                        prefix="R$"
                        min={0}
                        className="px-2.5 py-1.5 bg-amber-50/50 border border-amber-300 rounded-lg text-xs font-bold text-amber-900 tabular-nums text-right focus:bg-white min-h-[38px]"
                      />
                      <span className="text-[10px] text-stone-400 block mt-0.5">0 = preço sugerido</span>
                    </div>
                  </div>

                  {/* Financial Breakdown Table */}
                  <div className="space-y-1 text-xs border-t border-stone-100 pt-3">
                    <div className="flex justify-between py-1 border-b border-dashed border-stone-100">
                      <span className="text-stone-600">Rendimento de Fatias</span>
                      <strong className="text-stone-800 tabular-nums">{formatNumber(metrics.slices, 1)} fatias</strong>
                    </div>
                    <div className="flex justify-between py-1 border-b border-dashed border-stone-100">
                      <span className="text-stone-600">Custo dos Ingredientes</span>
                      <span className="tabular-nums text-stone-800">{formatCurrency(metrics.ingrCost)}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-dashed border-stone-100">
                      <span className="text-stone-600">
                        Gás ({formatNumber((recipe.time || 0) * sz.k, 0)} min {heat.label ? `· forno ${heat.label}` : ''})
                      </span>
                      <span className="tabular-nums text-stone-800">{formatCurrency(metrics.gasCost)}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-dashed border-stone-100">
                      <span className="text-stone-600">Energia Elétrica</span>
                      <span className="tabular-nums text-stone-800">{formatCurrency(metrics.elecCost)}</span>
                    </div>
                    {metrics.fuelCost > 0 && (
                      <div className="flex justify-between py-1 border-b border-dashed border-stone-100">
                        <span className="text-stone-600">Outros Custos</span>
                        <span className="tabular-nums text-stone-800">{formatCurrency(metrics.fuelCost)}</span>
                      </div>
                    )}
                    <div className="flex justify-between py-1 border-b border-dashed border-stone-100">
                      <span className="text-stone-600">Embalagem do Bolo</span>
                      <span className="tabular-nums text-stone-800">{formatCurrency(metrics.packCost)}</span>
                    </div>

                    {/* Total Cost Highlight */}
                    <div className="flex justify-between py-1.5 border-t border-stone-200 font-bold text-stone-900">
                      <span>Custo Total do Bolo</span>
                      <span className="tabular-nums text-stone-900">{formatCurrency(metrics.totalCost)}</span>
                    </div>
                    <div className="flex justify-between py-1 text-stone-600">
                      <span>Custo por fatia</span>
                      <span className="tabular-nums font-semibold">{formatCurrency(metrics.costPerSlice)}</span>
                    </div>

                    {/* Suggested Price Highlight */}
                    <div className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-200/80 my-2 space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-amber-900">
                          Preço Sugerido (margem {formatNumber(metrics.targetMarginPercent, 0)}%)
                        </span>
                        <strong className="text-base text-amber-900 tabular-nums">
                          {formatCurrency(metrics.suggestedCakePrice)}
                        </strong>
                      </div>
                      <div className="flex justify-between text-[11px] text-amber-800/80">
                        <span>Preço sugerido por fatia</span>
                        <span className="tabular-nums font-medium">{formatCurrency(metrics.suggestedSlicePrice)}</span>
                      </div>
                    </div>

                    {/* Real Margin & Profit when manual price is filled */}
                    {hasSell ? (
                      <div
                        className={`p-2.5 rounded-xl border space-y-1 ${
                          isProfitGood
                            ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
                            : 'bg-rose-50/80 border-rose-200 text-rose-900'
                        }`}
                      >
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-semibold">
                            Seu Preço ({formatCurrency(sz.sell)} · {formatCurrency(metrics.sellSlicePrice)}/fatia)
                          </span>
                          <span className="font-bold text-sm tabular-nums">
                            {formatPercent(metrics.realMarginPercent)} margem real
                          </span>
                        </div>
                        <div className="flex justify-between text-xs pt-1 border-t border-emerald-200/60">
                          <span>Lucro Líquido no Bolo:</span>
                          <strong className="tabular-nums text-sm">
                            {formatCurrency(metrics.cakeProfit)} ({formatCurrency(metrics.sliceProfit)}/fatia)
                          </strong>
                        </div>
                      </div>
                    ) : (
                      <div className="text-[11px] text-stone-500 italic p-1">
                        Dica: Digite "Seu Preço de Venda" acima para conferir sua margem real e o lucro deste tamanho.
                      </div>
                    )}
                  </div>

                  {/* Visual Cost Bar */}
                  <div className="mt-3 pt-3 border-t border-stone-100">
                    <div className="flex justify-between text-[10px] text-stone-500 mb-1">
                      <span>Composição dos custos</span>
                      <span className="tabular-nums">Total {formatCurrency(metrics.totalCost)}</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-stone-100 overflow-hidden flex">
                      {metrics.costBreakdown.map((item, bIdx) => (
                        <div
                          key={bIdx}
                          style={{ width: `${item.percent}%`, backgroundColor: item.color }}
                          title={`${item.label}: ${formatCurrency(item.value)} (${formatNumber(item.percent, 0)}%)`}
                          className="h-full first:rounded-l-full last:rounded-r-full"
                        />
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-x-2 gap-y-1 text-[10px] text-stone-500 mt-1.5">
                      {metrics.costBreakdown.map((item, bIdx) => (
                        <span key={bIdx} className="flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: item.color }} />
                          {item.label} ({formatNumber(item.percent, 0)}%)
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Embedded Production Scaler for this Cake */}
      <div className="bg-stone-900 text-stone-100 rounded-2xl p-4 sm:p-5 shadow-md space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-white font-display flex items-center gap-2">
              <Scale className="w-5 h-5 text-amber-400" />
              <span>Escalonar Produção Imediata</span>
            </h3>
            <p className="text-xs text-stone-400">
              Calcule quantos bolos você precisa assar para ver a lista de compras exata e lucro da encomenda.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={scaleSizeIndex}
              onChange={(e) => setScaleSizeIndex(parseInt(e.target.value, 10))}
              className="px-3 py-1.5 bg-stone-800 border border-stone-700 rounded-xl text-xs font-semibold text-white focus:border-amber-400 min-h-[38px]"
            >
              {sizes.map((sz, idx) => (
                <option key={sz.id} value={idx}>
                  Tamanho {sz.nome} (fator {sz.k})
                </option>
              ))}
            </select>

            <div className="flex items-center gap-1.5">
              <span className="text-xs text-stone-400">Qtd:</span>
              <div className="w-20">
                <NumericInput
                  value={scaleCakeCount}
                  onChange={(val) => setScaleCakeCount(val)}
                  placeholder="1"
                  min={0.1}
                  className="px-2.5 py-1.5 bg-stone-800 border border-stone-700 rounded-xl text-xs font-bold text-white text-right tabular-nums focus:border-amber-400 min-h-[38px]"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Scaled Results Box */}
        <div className="bg-stone-800/80 border border-stone-700/80 rounded-xl p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-amber-300 font-medium">
            <span>
              Produção de <strong>{formatNumber(scaleResult.cakeCount)} bolo(s) {selectedSizeForScale.nome}</strong>
            </span>
            <span>Rendimento total: <strong>{formatNumber(scaleResult.totalSlices, 1)} fatias</strong></span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-stone-700 text-stone-400">
                  <th className="py-1.5 font-medium">Ingrediente</th>
                  <th className="py-1.5 font-medium text-right">Qtd Total</th>
                  <th className="py-1.5 font-medium text-right">Custo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-700/60">
                {scaleResult.ingredients.map((item, iIdx) => (
                  <tr key={iIdx}>
                    <td className="py-1.5 text-stone-200">{item.name}</td>
                    <td className="py-1.5 text-right font-medium text-stone-300 tabular-nums">
                      {formatNumber(item.scaledQty, 2)} {item.unit}
                    </td>
                    <td className="py-1.5 text-right text-stone-400 tabular-nums">
                      {formatCurrency(item.cost)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-3 border-t border-stone-700 text-center">
            <div className="bg-stone-900/60 p-2.5 rounded-lg">
              <span className="block text-[10px] text-stone-400">Custo Total</span>
              <strong className="text-xs text-rose-300 tabular-nums">{formatCurrency(scaleResult.totalCost)}</strong>
            </div>
            <div className="bg-stone-900/60 p-2.5 rounded-lg">
              <span className="block text-[10px] text-stone-400">Receita Estimada</span>
              <strong className="text-xs text-sky-300 tabular-nums">{formatCurrency(scaleResult.totalRevenue)}</strong>
            </div>
            <div className="bg-stone-900/60 p-2.5 rounded-lg">
              <span className="block text-[10px] text-stone-400">Lucro Líquido</span>
              <strong className="text-xs text-emerald-400 tabular-nums">{formatCurrency(scaleResult.totalProfit)}</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
