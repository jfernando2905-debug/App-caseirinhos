import React, { useState, useEffect } from 'react';
import { X, Plus, CheckCircle2, Egg, Boxes, AlertCircle } from 'lucide-react';
import { Ingredient, Unit } from '../types';
import { uid } from '../utils/storage';
import { getCompatibleUnits } from '../utils/calculations';
import { NumericInput } from './NumericInput';

interface IngredientFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (
    newIngredient: Ingredient,
    recipeUsage?: { qty: number; unit: Unit },
    keepOpen?: boolean
  ) => void;
  isForRecipe?: boolean;
}

export const IngredientFormModal: React.FC<IngredientFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  isForRecipe = true,
}) => {
  const [name, setName] = useState<string>('');
  const [category, setCategory] = useState<string>('');
  const [price, setPrice] = useState<number>(0);
  const [size, setSize] = useState<number>(1);
  const [unit, setUnit] = useState<Unit>('kg');
  const [stock, setStock] = useState<number>(0);
  const [minStock, setMinStock] = useState<number>(0);

  // Recipe usage fields (optional, used when adding directly to a recipe)
  const [recipeQty, setRecipeQty] = useState<number>(100);
  const [recipeUnit, setRecipeUnit] = useState<Unit>('g');

  const [formError, setFormError] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');

  // Reset or adjust default recipe unit when purchase unit changes
  useEffect(() => {
    if (unit === 'kg') {
      setRecipeUnit('g');
      if (recipeQty === 1) setRecipeQty(100);
    } else if (unit === 'L') {
      setRecipeUnit('ml');
      if (recipeQty === 1) setRecipeQty(100);
    } else {
      setRecipeUnit(unit);
      if (unit === 'un' && recipeQty === 100) setRecipeQty(1);
    }
  }, [unit]);

  if (!isOpen) return null;

  const resetFields = () => {
    setName('');
    setCategory('');
    setPrice(0);
    setSize(1);
    setUnit('kg');
    setStock(0);
    setMinStock(0);
    setRecipeQty(100);
    setRecipeUnit('g');
    setFormError('');
  };

  const handleSave = (keepOpen: boolean = false) => {
    setFormError('');
    setSuccessMsg('');

    if (!name.trim()) {
      setFormError('Por favor, informe o nome do ingrediente.');
      return;
    }

    if (size <= 0) {
      setFormError('O tamanho da embalagem deve ser maior que zero.');
      return;
    }

    const isBanana = name.toLowerCase().includes('banana');
    let finalUnit = unit;
    if (isBanana && unit === 'un') {
      finalUnit = size > 10 ? 'g' : 'kg';
    }

    const newIng: Ingredient = {
      id: uid(),
      name: name.trim(),
      price: Math.max(price, 0),
      size: Math.max(size, 0.001),
      unit: finalUnit,
      category: category.trim() || (isBanana ? 'Hortifrúti' : undefined),
      stock: Math.max(stock, 0),
      minStock: minStock > 0 ? minStock : undefined,
      hist: [
        {
          d: Date.now(),
          price: Math.max(price, 0),
          size: Math.max(size, 0.001),
          unit: finalUnit,
        },
      ],
    };

    const usage = isForRecipe ? { qty: Math.max(recipeQty, 0.01), unit: recipeUnit } : undefined;

    onSave(newIng, usage, keepOpen);

    setSuccessMsg(`Ingrediente "${newIng.name}" cadastrado com sucesso!`);

    if (keepOpen) {
      resetFields();
      setTimeout(() => setSuccessMsg(''), 3000);
    } else {
      resetFields();
      onClose();
    }
  };

  const compatibleRecipeUnits = isForRecipe ? getCompatibleUnits(unit) : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 rounded-2xl max-w-lg w-full p-4 sm:p-6 shadow-2xl border border-stone-200 dark:border-stone-800 my-6 animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-stone-100 dark:border-stone-800 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 flex items-center justify-center font-bold">
              <Egg className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-stone-900 dark:text-stone-100 font-display">
                Novo Ingrediente no Catálogo
              </h3>
              <p className="text-[11px] text-stone-500 dark:text-stone-400">
                {isForRecipe
                  ? 'Cadastre e adicione à receita sem sair desta tela.'
                  : 'Cadastre os dados de compra e embalagem.'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl hover:bg-stone-100 dark:hover:bg-stone-800 flex items-center justify-center text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 transition-colors min-h-[38px] min-w-[38px]"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feedback Messages */}
        {formError && (
          <div className="p-3 mb-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-800 dark:text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3 mb-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        <div className="space-y-3.5">
          {/* Name & Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                Nome do Ingrediente *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => {
                  const val = e.target.value;
                  setName(val);
                  if (val.toLowerCase().includes('banana')) {
                    if (unit === 'un') setUnit('kg');
                    if (!category) setCategory('Hortifrúti');
                  }
                }}
                placeholder="Ex: Leite condensado, Farinha de Trigo"
                className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500 rounded-xl text-sm font-medium focus:bg-white dark:focus:bg-stone-800 focus:border-amber-500 transition-colors min-h-[42px]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                Categoria (opcional)
              </label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="Ex: Laticínios, Secos, Frutas"
                className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500 rounded-xl text-sm font-medium focus:bg-white dark:focus:bg-stone-800 focus:border-amber-500 transition-colors min-h-[42px]"
              />
            </div>
          </div>

          {/* Purchasing Package Info (Price, Size, Unit) */}
          <div className="p-3 bg-stone-50 dark:bg-stone-800/60 border border-stone-200/80 dark:border-stone-700/80 rounded-2xl space-y-2">
            <span className="block text-[11px] font-bold text-stone-700 dark:text-stone-300 uppercase tracking-wider">
              Dados da Embalagem de Compra
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Preço pago (R$) *
                </label>
                <NumericInput
                  value={price}
                  onChange={(val) => setPrice(val)}
                  placeholder="0,00"
                  prefix="R$"
                  min={0}
                  className="px-3 py-2 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 rounded-xl text-sm font-bold tabular-nums text-right focus:border-amber-500 min-h-[42px]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Tamanho Embalagem *
                </label>
                <NumericInput
                  value={size}
                  onChange={(val) => setSize(val)}
                  placeholder="1"
                  min={0.001}
                  maxDecimals={3}
                  className="px-3 py-2 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 rounded-xl text-sm font-semibold tabular-nums text-right focus:border-amber-500 min-h-[42px]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Unidade de Compra *
                </label>
                <select
                  value={unit}
                  onChange={(e) => setUnit(e.target.value as Unit)}
                  className="w-full px-2.5 py-2 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 rounded-xl text-sm font-medium focus:border-amber-500 min-h-[42px]"
                >
                  <option value="g">g (grama)</option>
                  <option value="kg">kg (quilo)</option>
                  <option value="ml">ml (mililitro)</option>
                  <option value="L">L (litro)</option>
                  <option value="un">un (unidade)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Recipe Usage Fields (If called from Recipe Editor) */}
          {isForRecipe && (
            <div className="p-3 bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/60 rounded-2xl space-y-2">
              <span className="block text-[11px] font-bold text-amber-900 dark:text-amber-200 uppercase tracking-wider">
                Uso Nesta Receita
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-amber-950 dark:text-amber-200 mb-1">
                    Quantidade a usar na receita *
                  </label>
                  <NumericInput
                    value={recipeQty}
                    onChange={(val) => setRecipeQty(val)}
                    placeholder="100"
                    min={0.01}
                    maxDecimals={2}
                    className="px-3 py-2 bg-white dark:bg-stone-800 border border-amber-300 dark:border-amber-700 text-stone-900 dark:text-stone-100 rounded-xl text-sm font-bold tabular-nums text-right focus:border-amber-500 min-h-[42px]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-amber-950 dark:text-amber-200 mb-1">
                    Unidade na receita *
                  </label>
                  <select
                    value={recipeUnit}
                    onChange={(e) => setRecipeUnit(e.target.value as Unit)}
                    className="w-full px-2.5 py-2 bg-white dark:bg-stone-800 border border-amber-300 dark:border-amber-700 text-stone-900 dark:text-stone-100 rounded-xl text-sm font-medium focus:border-amber-500 min-h-[42px]"
                  >
                    {compatibleRecipeUnits.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Optional Initial Stock */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                Estoque Inicial ({unit}) - Opcional
              </label>
              <NumericInput
                value={stock}
                onChange={(val) => setStock(val)}
                placeholder="0"
                min={0}
                maxDecimals={3}
                className="px-3 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 rounded-xl text-xs font-semibold tabular-nums text-right focus:bg-white min-h-[38px]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                Estoque Mínimo ({unit}) - Opcional
              </label>
              <NumericInput
                value={minStock}
                onChange={(val) => setMinStock(val)}
                placeholder="0"
                min={0}
                maxDecimals={3}
                className="px-3 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 rounded-xl text-xs font-semibold tabular-nums text-right focus:bg-white min-h-[38px]"
              />
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 mt-5 pt-4 border-t border-stone-100 dark:border-stone-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-xl transition-colors min-h-[42px] cursor-pointer"
          >
            Cancelar
          </button>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <button
              type="button"
              onClick={() => handleSave(true)}
              className="px-3.5 py-2 text-xs font-semibold text-amber-900 dark:text-amber-200 bg-amber-100 hover:bg-amber-200 dark:bg-amber-950 dark:hover:bg-amber-900 border border-amber-300 dark:border-amber-700 rounded-xl transition-colors min-h-[42px] cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Plus className="w-4 h-4 text-amber-700 dark:text-amber-400" />
              <span>Salvar e Cadastrar Outro</span>
            </button>

            <button
              type="button"
              onClick={() => handleSave(false)}
              className="px-5 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-500 rounded-xl transition-colors min-h-[42px] cursor-pointer shadow-xs flex items-center justify-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Salvar e Adicionar</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
