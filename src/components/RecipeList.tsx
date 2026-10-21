import React, { useState } from 'react';
import {
  Cake,
  Clock,
  Flame,
  AlertCircle,
  Copy,
  Scale,
  Plus,
  Sparkles,
  ChevronRight,
  FileDown,
  Search,
  X,
  Tag,
  Trash2,
} from 'lucide-react';
import { Recipe, AppData } from '../types';
import { calculateSizeMetrics, formatCurrency, formatNumber } from '../utils/calculations';
import { generateRecipePdf } from '../utils/recipePdf';

interface RecipeListProps {
  data: AppData;
  onOpenRecipe: (recipe: Recipe) => void;
  onNewRecipe: () => void;
  onOpenPaste: () => void;
  onDuplicateRecipe: (recipe: Recipe) => void;
  onQuickScale: (recipe: Recipe) => void;
  onSeedData: () => void;
  onDeleteRecipe?: (recipeId: string) => void;
  onToast?: (msg: string, type?: 'success' | 'info' | 'error') => void;
}

export const RecipeList: React.FC<RecipeListProps> = ({
  data,
  onOpenRecipe,
  onNewRecipe,
  onOpenPaste,
  onDuplicateRecipe,
  onQuickScale,
  onSeedData,
  onDeleteRecipe,
  onToast,
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('todas');
  const [deleteConfirmRecipe, setDeleteConfirmRecipe] = useState<Recipe | null>(null);

  const normalizeText = (text: string) =>
    text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');

  const categories = Array.from(
    new Set(
      (data.recs || [])
        .map((r) => r.category?.trim())
        .filter((c): c is string => !!c && c.length > 0)
    )
  ).sort();

  const filteredRecipes = (data.recs || []).filter((rec) => {
    const term = normalizeText(searchTerm.trim());
    const matchesCategory =
      selectedCategory === 'todas' ||
      (rec.category && rec.category.toLowerCase() === selectedCategory.toLowerCase());

    if (!matchesCategory) return false;
    if (!term) return true;

    const nameMatch = normalizeText(rec.name || '').includes(term);
    const catMatch = normalizeText(rec.category || '').includes(term);
    return nameMatch || catMatch;
  });

  const handleExportRecipePdf = (rec: Recipe) => {
    try {
      generateRecipePdf(rec, data.ings, data.cfg);
      if (onToast) {
        onToast(`Ficha técnica de "${rec.name}" baixada em PDF!`);
      }
    } catch (err: any) {
      if (onToast) {
        onToast('Erro ao exportar PDF: ' + err.message, 'error');
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-stone-900 dark:text-stone-100 font-display">
            Minhas Receitas
          </h2>
          <p className="text-sm text-stone-600 dark:text-stone-400 mt-0.5">
            Calcule o custo exato por fatia, bolo inteiro e veja sua margem real de lucro.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={onOpenPaste}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-stone-700 dark:text-stone-300 bg-white dark:bg-stone-900 hover:bg-stone-50 dark:hover:bg-stone-800 border border-stone-200 dark:border-stone-800 rounded-xl shadow-xs transition-all active:scale-[0.98] min-h-[42px]"
          >
            <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <span>Colar Receita</span>
          </button>
          <button
            onClick={onNewRecipe}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-500 rounded-xl shadow-xs transition-all active:scale-[0.98] min-h-[42px]"
          >
            <Plus className="w-4 h-4" />
            <span>Nova Receita</span>
          </button>
        </div>
      </div>

      {/* Search & Filter Bar */}
      {data.recs.length > 0 && (
        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-3 sm:p-4 shadow-xs space-y-3">
          <div className="relative flex items-center">
            <Search className="w-4 h-4 text-stone-400 dark:text-stone-500 absolute left-3.5 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar receitas por nome ou categoria (ex: Cenoura, Chocolate, Cremosos...)"
              className="w-full pl-10 pr-9 py-2.5 bg-stone-50 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700 rounded-xl text-sm font-medium text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500 focus:outline-none focus:bg-white dark:focus:bg-stone-800 focus:border-amber-500 dark:focus:border-amber-500 transition-colors"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 p-1 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 rounded-lg transition-colors"
                title="Limpar busca"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Quick Categories Filter Pills */}
          {categories.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
              <button
                onClick={() => setSelectedCategory('todas')}
                className={`px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition-colors min-h-[34px] ${
                  selectedCategory === 'todas'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700'
                }`}
              >
                Todas ({data.recs.length})
              </button>
              {categories.map((cat) => {
                const count = data.recs.filter((r) => r.category === cat).length;
                return (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition-colors min-h-[34px] ${
                      selectedCategory === cat
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700'
                    }`}
                  >
                    {cat} ({count})
                  </button>
                );
              })}
            </div>
          )}

          {/* Result count & reset info when searching or filtered */}
          {(searchTerm || selectedCategory !== 'todas') && (
            <div className="flex items-center justify-between text-xs text-stone-500 dark:text-stone-400 pt-1 border-t border-stone-100 dark:border-stone-800">
              <span>
                Mostrando <strong>{filteredRecipes.length}</strong> de {data.recs.length} receita(s)
              </span>
              <button
                onClick={() => {
                  setSearchTerm('');
                  setSelectedCategory('todas');
                }}
                className="text-amber-600 dark:text-amber-400 hover:underline font-semibold"
              >
                Limpar filtros
              </button>
            </div>
          )}
        </div>
      )}

      {/* Recipe Cards List */}
      {data.recs.length === 0 ? (
        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-8 sm:p-12 text-center shadow-xs">
          <div className="w-16 h-16 bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Cake className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-stone-800 dark:text-stone-200 font-display">
            Nenhuma receita cadastrada
          </h3>
          <p className="text-sm text-stone-600 dark:text-stone-400 max-w-md mx-auto mt-1 mb-6">
            Você pode começar criando uma receita do zero, colando uma receita da internet ou carregando nossos exemplos prontos de bolos caseiros.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={onSeedData}
              className="px-4 py-2.5 text-xs font-semibold text-amber-900 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/60 hover:bg-amber-200 dark:hover:bg-amber-900/60 rounded-xl transition-colors min-h-[42px]"
            >
              Carregar Bolos de Exemplo
            </button>
            <button
              onClick={onNewRecipe}
              className="px-4 py-2.5 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-500 rounded-xl transition-colors min-h-[42px]"
            >
              Criar Nova Receita
            </button>
          </div>
        </div>
      ) : filteredRecipes.length === 0 ? (
        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-8 sm:p-12 text-center shadow-xs">
          <Search className="w-10 h-10 text-stone-300 dark:text-stone-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-stone-800 dark:text-stone-200 font-display">
            Nenhuma receita encontrada
          </h3>
          <p className="text-xs text-stone-500 dark:text-stone-400 max-w-sm mx-auto mt-1 mb-4">
            Não encontramos nenhum bolo com os termos informados. Verifique a digitação ou limpe a busca.
          </p>
          <button
            onClick={() => {
              setSearchTerm('');
              setSelectedCategory('todas');
            }}
            className="px-4 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-500 rounded-xl transition-all"
          >
            Limpar Busca e Filtros
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredRecipes.map((rec) => {
            const sizes =
              rec.sizes && rec.sizes.length > 0
                ? rec.sizes
                : [{ id: 'default', nome: 'Padrão', k: 1, pack: rec.pack || 0, sell: rec.sell || 0 }];

            // Check if any ingredient is missing price
            const missingPrices = (rec.items || []).filter((it) => {
              const ing = data.ings.find((i) => i.id === it.ing);
              return !ing || ing.price <= 0;
            });

            return (
              <div
                key={rec.id}
                className="bg-white dark:bg-stone-900 border border-stone-200/90 dark:border-stone-800 hover:border-amber-400/80 dark:hover:border-amber-500/60 rounded-2xl p-5 shadow-xs transition-all hover:shadow-md flex flex-col justify-between group"
              >
                <div>
                  {/* Header info */}
                  <div className="flex items-start justify-between gap-3 mb-2.5">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        {rec.category && (
                          <span className="text-[11px] font-medium text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 border border-amber-200/60 dark:border-amber-800/60 px-2 py-0.5 rounded-md">
                            {rec.category}
                          </span>
                        )}
                        <span className="text-xs text-stone-500 dark:text-stone-400">
                          {rec.items?.length || 0} ingredientes
                        </span>
                      </div>

                      <h3
                        onClick={() => onOpenRecipe(rec)}
                        className="text-lg font-bold text-stone-900 dark:text-stone-100 font-display group-hover:text-amber-700 dark:group-hover:text-amber-400 transition-colors cursor-pointer"
                      >
                        {rec.name || 'Bolo Sem Nome'}
                      </h3>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteConfirmRecipe(rec);
                        }}
                        className="w-8 h-8 rounded-lg bg-stone-50 dark:bg-stone-800 hover:bg-rose-50 dark:hover:bg-rose-950/50 flex items-center justify-center text-stone-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
                        title="Excluir receita"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => onOpenRecipe(rec)}
                        className="w-8 h-8 rounded-lg bg-stone-50 dark:bg-stone-800 hover:bg-amber-100 dark:hover:bg-amber-900/40 flex items-center justify-center text-stone-400 hover:text-amber-700 dark:hover:text-amber-400 transition-colors"
                        title="Editar receita"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Badges / Specs */}
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-stone-600 dark:text-stone-400 mb-4 pb-3 border-b border-stone-100 dark:border-stone-800">
                    <span className="flex items-center gap-1 font-medium text-stone-700 dark:text-stone-300">
                      🍰 {formatNumber(rec.yield)} fatias (base)
                    </span>
                    <span aria-hidden="true" className="text-stone-300 dark:text-stone-700">·</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-stone-400" />
                      {rec.time || 0} min
                    </span>
                    {rec.temp && (
                      <>
                        <span aria-hidden="true" className="text-stone-300 dark:text-stone-700">·</span>
                        <span className="flex items-center gap-1">
                          <Flame className="w-3.5 h-3.5 text-orange-500" />
                          {rec.temp}°C
                        </span>
                      </>
                    )}
                    <span aria-hidden="true" className="text-stone-300 dark:text-stone-700">·</span>
                    <span>Margem: {rec.margin || data.cfg.margin}%</span>
                  </div>

                  {/* Missing price alert */}
                  {missingPrices.length > 0 && (
                    <div className="mb-3 p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-800 dark:text-rose-300 text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                      <span>
                        <strong>{missingPrices.length} ingrediente(s) sem preço</strong> cadastrado.
                      </span>
                    </div>
                  )}

                  {/* Sizes and Prices summary */}
                  <div className="space-y-1.5 mb-4">
                    <p className="text-[11px] font-semibold text-stone-400 dark:text-stone-500 uppercase tracking-wider">
                      Preços por tamanho:
                    </p>
                    {sizes.map((sz) => {
                      const res = calculateSizeMetrics(rec, sz, data.cfg, data.ings);
                      const hasManualSell = sz.sell > 0;
                      return (
                        <div
                          key={sz.id}
                          className="flex items-center justify-between text-xs py-1 px-2.5 rounded-lg bg-stone-50 dark:bg-stone-800/60 border border-stone-100 dark:border-stone-800"
                        >
                          <span className="font-semibold text-stone-800 dark:text-stone-200">
                            {sz.nome}:
                          </span>

                          <div className="flex flex-wrap items-center justify-end gap-1.5 text-right">
                            <span className="font-bold text-amber-800 dark:text-amber-400 tabular-nums">
                              {formatCurrency(hasManualSell ? sz.sell : res.suggestedCakePrice)}
                            </span>
                            <span className="text-[11px] text-stone-500 dark:text-stone-400 hidden sm:inline tabular-nums">
                              (custo {formatCurrency(res.totalCost)} · {formatCurrency(res.costPerSlice)}/fat)
                            </span>
                            {hasManualSell && (
                              <span
                                className={`text-[10px] font-semibold px-1.5 py-0.5 rounded tabular-nums ${
                                  res.cakeProfit >= 0
                                    ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                                    : 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300'
                                }`}
                              >
                                {formatNumber(res.realMarginPercent, 0)}% margem
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Footer Controls */}
                <div className="pt-3 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => onQuickScale(rec)}
                      className="px-3 py-2 text-xs font-semibold text-stone-700 dark:text-stone-300 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 rounded-xl flex items-center gap-1 transition-colors min-h-[40px]"
                      title="Escalonar produção deste bolo"
                    >
                      <Scale className="w-3.5 h-3.5 text-stone-600 dark:text-stone-400 shrink-0" />
                      <span>Escalonar</span>
                    </button>
                    <button
                      onClick={() => onDuplicateRecipe(rec)}
                      className="px-3 py-2 text-xs font-semibold text-stone-700 dark:text-stone-300 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 rounded-xl flex items-center gap-1 transition-colors min-h-[40px]"
                      title="Duplicar esta receita"
                    >
                      <Copy className="w-3.5 h-3.5 text-stone-600 dark:text-stone-400 shrink-0" />
                      <span className="hidden sm:inline">Duplicar</span>
                    </button>
                    <button
                      onClick={() => handleExportRecipePdf(rec)}
                      className="px-3 py-2 text-xs font-semibold text-stone-700 dark:text-stone-300 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 rounded-xl flex items-center gap-1 transition-colors min-h-[40px]"
                      title="Baixar ficha técnica completa em PDF"
                    >
                      <FileDown className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                      <span>Ficha PDF</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => setDeleteConfirmRecipe(rec)}
                      className="px-2.5 py-2 text-xs font-semibold text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200/80 dark:border-rose-900/60 hover:border-rose-300 rounded-xl transition-colors flex items-center gap-1 min-h-[40px]"
                      title="Excluir receita"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Excluir</span>
                    </button>

                    <button
                      onClick={() => onOpenRecipe(rec)}
                      className="px-3.5 py-2 text-xs font-semibold text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/60 border border-amber-200/80 dark:border-amber-800/60 rounded-xl transition-colors flex items-center gap-1 min-h-[40px]"
                    >
                      <span>Editar</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Recipe Confirmation Modal */}
      {deleteConfirmRecipe && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-stone-900 rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-stone-200 dark:border-stone-800 space-y-4">
            <h3 className="text-lg font-bold text-stone-900 dark:text-stone-100 font-display flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
              <span>Excluir Receita?</span>
            </h3>
            <p className="text-sm text-stone-600 dark:text-stone-300 leading-relaxed">
              Tem certeza que deseja apagar a receita <strong>&quot;{deleteConfirmRecipe.name}&quot;</strong>? Esta ação não pode ser desfeita.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmRecipe(null)}
                className="px-4 py-2 text-xs font-semibold text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-xl transition-colors min-h-[42px]"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onDeleteRecipe) {
                    onDeleteRecipe(deleteConfirmRecipe.id);
                  }
                  setDeleteConfirmRecipe(null);
                }}
                className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors min-h-[42px] shadow-xs"
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
