import React, { useState } from 'react';
import {
  Egg,
  Plus,
  Search,
  AlertTriangle,
  History,
  Trash2,
  Edit2,
  TrendingUp,
  TrendingDown,
  X,
} from 'lucide-react';
import { Ingredient, Recipe, Unit } from '../types';
import { getPerLabel, formatCurrency, formatNumber, UNIT_FACTORS } from '../utils/calculations';
import { uid } from '../utils/storage';
import { NumericInput } from './NumericInput';

interface IngredientManagerProps {
  ingredients: Ingredient[];
  recipes: Recipe[];
  onSaveIngredient: (ingredient: Ingredient) => void;
  onDeleteIngredient: (id: string) => void;
}

export const IngredientManager: React.FC<IngredientManagerProps> = ({
  ingredients,
  recipes,
  onSaveIngredient,
  onDeleteIngredient,
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterMissingPrice, setFilterMissingPrice] = useState<boolean>(false);
  const [selectedUnit, setSelectedUnit] = useState<string>('all');
  const [editingIngredient, setEditingIngredient] = useState<Ingredient | null>(null);
  const [isNew, setIsNew] = useState<boolean>(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Form state inside modal
  const [formName, setFormName] = useState<string>('');
  const [formPrice, setFormPrice] = useState<number>(0);
  const [formSize, setFormSize] = useState<number>(1);
  const [formUnit, setFormUnit] = useState<Unit>('kg');
  const [formCategory, setFormCategory] = useState<string>('');
  const [formError, setFormError] = useState<string>('');

  const openNewModal = () => {
    setIsNew(true);
    setFormName('');
    setFormPrice(0);
    setFormSize(1);
    setFormUnit('kg');
    setFormCategory('');
    setFormError('');
    setEditingIngredient({
      id: uid(),
      name: '',
      price: 0,
      size: 1,
      unit: 'kg',
      hist: [],
    });
  };

  const openEditModal = (ing: Ingredient) => {
    setIsNew(false);
    setFormName(ing.name);
    setFormPrice(ing.price || 0);
    setFormSize(ing.size || 1);
    setFormUnit(ing.unit);
    setFormCategory(ing.category || '');
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

    const currentHistory = editingIngredient?.hist ? [...editingIngredient.hist] : [];
    const lastHist = currentHistory[currentHistory.length - 1];

    // If price, size or unit changed, add to history
    if (
      !lastHist ||
      lastHist.price !== formPrice ||
      lastHist.size !== formSize ||
      lastHist.unit !== formUnit
    ) {
      currentHistory.push({
        d: Date.now(),
        price: formPrice,
        size: formSize,
        unit: formUnit,
      });
    }

    const updatedIng: Ingredient = {
      id: editingIngredient?.id || uid(),
      name: formName.trim(),
      price: Math.max(formPrice, 0),
      size: Math.max(formSize, 0.001),
      unit: formUnit,
      hist: currentHistory,
      category: formCategory.trim() || undefined,
    };

    onSaveIngredient(updatedIng);
    setEditingIngredient(null);
  };

  // Filtered ingredients
  const filtered = ingredients
    .filter((ing) => {
      const matchSearch =
        ing.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (ing.category && ing.category.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchMissing = filterMissingPrice ? ing.price <= 0 : true;
      const matchUnit = selectedUnit === 'all' || ing.unit === selectedUnit;
      return matchSearch && matchMissing && matchUnit;
    })
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));

  const missingPricesCount = ingredients.filter((i) => i.price <= 0).length;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-stone-900 font-display">
            Catálogo de Ingredientes
          </h2>
          <p className="text-xs sm:text-sm text-stone-600 mt-0.5">
            Cadastre os preços pagos nas embalagens. Cada alteração cria histórico de variação percentual.
          </p>
        </div>

        <button
          onClick={openNewModal}
          className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-500 rounded-xl shadow-xs transition-all active:scale-[0.98] min-h-[40px] sm:min-h-[42px]"
        >
          <Plus className="w-4 h-4 shrink-0" />
          <span>Novo Ingrediente</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-stone-200 rounded-2xl p-4 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nome do ingrediente ou categoria..."
              className="w-full pl-9 pr-8 py-2 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:bg-white focus:border-amber-500 transition-colors min-h-[42px]"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedUnit}
              onChange={(e) => setSelectedUnit(e.target.value)}
              className="px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium text-stone-700 focus:bg-white min-h-[42px]"
            >
              <option value="all">Todas Unidades</option>
              <option value="kg">kg (Quilograma)</option>
              <option value="g">g (Grama)</option>
              <option value="L">L (Litro)</option>
              <option value="ml">ml (Mililitro)</option>
              <option value="un">un (Unidade)</option>
            </select>

            <button
              onClick={() => setFilterMissingPrice(!filterMissingPrice)}
              className={`px-3 py-2 text-xs font-semibold rounded-xl border transition-colors whitespace-nowrap min-h-[42px] flex items-center gap-1.5 ${
                filterMissingPrice
                  ? 'bg-rose-100 text-rose-900 border-rose-300'
                  : 'bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
              <span>Sem Preço ({missingPricesCount})</span>
            </button>
          </div>
        </div>
      </div>

      {/* Ingredients List Cards */}
      {filtered.length === 0 ? (
        <div className="bg-white border border-stone-200 rounded-2xl p-8 text-center shadow-xs">
          <Egg className="w-10 h-10 text-stone-300 mx-auto mb-2" />
          <p className="text-sm font-semibold text-stone-700">Nenhum ingrediente encontrado</p>
          <p className="text-xs text-stone-500 mt-1">
            {searchTerm || filterMissingPrice
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

            return (
              <div
                key={ing.id}
                onClick={() => openEditModal(ing)}
                className={`bg-white border rounded-2xl p-4 shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group ${
                  hasNoPrice
                    ? 'border-rose-300 bg-rose-50/20'
                    : 'border-stone-200 hover:border-amber-400'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      {ing.category && (
                        <span className="text-[10px] font-semibold text-stone-500 uppercase tracking-wider block mb-0.5">
                          {ing.category}
                        </span>
                      )}
                      <h3 className="text-base font-bold text-stone-900 font-display group-hover:text-amber-700 transition-colors">
                        {ing.name}
                      </h3>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditModal(ing);
                      }}
                      className="w-8 h-8 rounded-lg bg-stone-50 group-hover:bg-amber-100 flex items-center justify-center text-stone-400 group-hover:text-amber-700 transition-colors min-h-[38px] min-w-[38px]"
                      title="Editar ingrediente"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-1 my-3">
                    <div className="flex justify-between items-baseline text-xs">
                      <span className="text-stone-500">Preço pago:</span>
                      <strong className={`tabular-nums ${hasNoPrice ? 'text-rose-600' : 'text-stone-900 text-sm'}`}>
                        {hasNoPrice ? '⚠ R$ 0,00' : formatCurrency(ing.price)}
                      </strong>
                    </div>

                    <div className="flex justify-between items-baseline text-xs">
                      <span className="text-stone-500">Embalagem:</span>
                      <span className="text-stone-700 tabular-nums">
                        {formatNumber(ing.size, 2)} {ing.unit}
                      </span>
                    </div>

                    <div className="flex justify-between items-baseline text-xs pt-1 border-t border-stone-100 font-medium">
                      <span className="text-stone-500">Custo base:</span>
                      <strong className="text-amber-800 tabular-nums">
                        {hasNoPrice ? 'Preço não definido' : getPerLabel(ing)}
                      </strong>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-[11px] text-stone-400">
                  <span>
                    {usedInCount === 0
                      ? 'Não usado em receitas'
                      : `Usado em ${usedInCount} receita(s)`}
                  </span>
                  {historyCount > 1 && (
                    <span className="flex items-center gap-1 text-stone-500">
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
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-stone-200 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100 mb-4">
              <h3 className="text-lg font-bold text-stone-900 font-display">
                {isNew ? 'Novo Ingrediente' : 'Editar Ingrediente'}
              </h3>
              <button
                onClick={() => setEditingIngredient(null)}
                className="w-8 h-8 rounded-lg hover:bg-stone-100 flex items-center justify-center text-stone-400 hover:text-stone-600 min-h-[38px] min-w-[38px]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 mb-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
                {formError}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Nome do Ingrediente *
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Ex: Farinha de trigo especial"
                  className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm font-medium focus:bg-white focus:border-amber-500 transition-colors min-h-[44px]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Categoria (opcional)
                </label>
                <input
                  type="text"
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  placeholder="Ex: Secos, Laticínios, Confeitaria, Hortifrúti"
                  className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm font-medium focus:bg-white focus:border-amber-500 transition-colors min-h-[44px]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Preço pago (R$) *
                  </label>
                  <NumericInput
                    value={formPrice}
                    onChange={(val) => setFormPrice(val)}
                    placeholder="0,00"
                    prefix="R$"
                    min={0}
                    className="px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-sm font-bold tabular-nums text-right focus:bg-white min-h-[42px]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Tamanho da embalagem *
                  </label>
                  <NumericInput
                    value={formSize}
                    onChange={(val) => setFormSize(val)}
                    placeholder="1"
                    min={0.001}
                    maxDecimals={3}
                    className="px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-sm font-semibold tabular-nums text-right focus:bg-white min-h-[42px]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Unidade de compra *
                  </label>
                  <select
                    value={formUnit}
                    onChange={(e) => setFormUnit(e.target.value as Unit)}
                    className="w-full px-2.5 py-2 bg-stone-50 border border-stone-200 rounded-xl text-sm font-medium focus:bg-white focus:border-amber-500 min-h-[42px]"
                  >
                    <option value="g">g (grama)</option>
                    <option value="kg">kg (quilo)</option>
                    <option value="ml">ml (mililitro)</option>
                    <option value="L">L (litro)</option>
                    <option value="un">un (unidade)</option>
                  </select>
                </div>
              </div>

              {/* Price History Table */}
              {!isNew && editingIngredient.hist && editingIngredient.hist.length > 0 && (
                <div className="mt-4 pt-4 border-t border-stone-100">
                  <h4 className="text-xs font-bold text-stone-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <History className="w-3.5 h-3.5 text-amber-700" />
                    <span>Histórico de Preços e Variação</span>
                  </h4>

                  <div className="border border-stone-200 rounded-xl overflow-hidden text-xs max-h-44 overflow-y-auto">
                    <table className="w-full text-left">
                      <thead className="bg-stone-50 border-b border-stone-200 text-stone-600">
                        <tr>
                          <th className="py-2 px-3 font-semibold">Data</th>
                          <th className="py-2 px-3 font-semibold text-right">Preço / Emb.</th>
                          <th className="py-2 px-3 font-semibold text-right">Variação</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100">
                        {[...editingIngredient.hist].reverse().map((h, hIdx, arr) => {
                          const prev = arr[hIdx + 1];
                          const factorCurr = UNIT_FACTORS[h.unit] || 1;
                          const factorPrev = prev ? UNIT_FACTORS[prev.unit] || 1 : 1;
                          const puCurr = h.price / (h.size * factorCurr || 1);
                          const puPrev = prev ? prev.price / (prev.size * factorPrev || 1) : 0;
                          const diff = prev && puPrev > 0 ? ((puCurr / puPrev) - 1) * 100 : null;

                          return (
                            <tr key={hIdx}>
                              <td className="py-1.5 px-3 text-stone-600">
                                {new Date(h.d).toLocaleDateString('pt-BR')}
                              </td>
                              <td className="py-1.5 px-3 text-right font-medium text-stone-900 tabular-nums">
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
            <div className="flex items-center justify-between gap-3 mt-6 pt-4 border-t border-stone-100">
              <div>
                {!isNew && (
                  <button
                    onClick={() => {
                      setDeleteConfirmId(editingIngredient.id);
                    }}
                    className="px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50 rounded-xl transition-colors min-h-[42px] flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Excluir</span>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setEditingIngredient(null)}
                  className="px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-xl transition-colors min-h-[42px]"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSave}
                  className="px-5 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-500 rounded-xl transition-colors min-h-[42px]"
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
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl border border-stone-200">
            <h3 className="text-lg font-bold text-stone-900 font-display">Excluir Ingrediente?</h3>
            {(() => {
              const usedIn = recipes.filter((r) =>
                (r.items || []).some((it) => it.ing === deleteConfirmId)
              );
              return (
                <div className="mt-2 text-sm text-stone-600 space-y-2">
                  <p>
                    Tem certeza que deseja apagar este ingrediente do catálogo?
                  </p>
                  {usedIn.length > 0 && (
                    <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-medium">
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
                className="px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-xl min-h-[44px]"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  onDeleteIngredient(deleteConfirmId);
                  setDeleteConfirmId(null);
                  setEditingIngredient(null);
                }}
                className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl min-h-[44px]"
              >
                Confirmar Exclusão
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
