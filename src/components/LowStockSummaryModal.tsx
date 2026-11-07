import React, { useState } from 'react';
import {
  X,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Copy,
  Check,
  MessageCircle,
  FileText,
  Boxes,
  ShoppingBag,
} from 'lucide-react';
import { Ingredient, Recipe, Unit } from '../types';
import {
  getAllIngredientsStockStatus,
  generateLowStockReportText,
} from '../utils/stockUtils';
import { formatNumber } from '../utils/calculations';
import { Pencil } from 'lucide-react';

interface LowStockSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  ingredients: Ingredient[];
  recipes: Recipe[];
  onSaveIngredient?: (ingredient: Ingredient) => void;
  onEditIngredient?: (ingredient: Ingredient) => void;
  onToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
  onNavigateToScale?: () => void;
}

export const LowStockSummaryModal: React.FC<LowStockSummaryModalProps> = ({
  isOpen,
  onClose,
  ingredients,
  recipes,
  onSaveIngredient,
  onEditIngredient,
  onToast,
  onNavigateToScale,
}) => {
  const [copied, setCopied] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'cards' | 'text'>('cards');

  if (!isOpen) return null;

  const statuses = getAllIngredientsStockStatus(ingredients, recipes);
  const zeroItems = statuses.filter((s) => s.status === 'zero');
  const lowItems = statuses.filter((s) => s.status === 'low');
  const okItems = statuses.filter((s) => s.status === 'ok');

  const reportText = generateLowStockReportText(ingredients, recipes);

  const handleCopyText = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(reportText);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = reportText;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
      if (onToast) onToast('Resumo de estoque copiado com sucesso!');
    } catch (err: any) {
      console.error('Copy failed:', err);
      if (onToast) onToast('Não foi possível copiar o texto automaticamente.', 'error');
    }
  };

  const handleWhatsAppShare = () => {
    const encoded = encodeURIComponent(reportText);
    const url = `https://wa.me/?text=${encoded}`;
    window.open(url, '_blank', 'noopener,noreferrer');
    if (onToast) onToast('Abrindo WhatsApp com o resumo de compras...');
  };

  const getStepForUnit = (unit: Unit): number => {
    switch (unit) {
      case 'kg': return 0.5;
      case 'g': return 100;
      case 'L': return 0.5;
      case 'ml': return 100;
      case 'un': return 1;
      default: return 1;
    }
  };

  const handleQuickAdjustStock = (e: React.MouseEvent, ing: Ingredient, delta: number) => {
    e.stopPropagation();
    if (!onSaveIngredient) return;
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:px-6 border-b border-stone-100 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-900 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <Boxes className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-stone-900 dark:text-stone-100 font-display">
                Resumo de Estoque & Reposição
              </h2>
              <p className="text-[11px] text-stone-500 dark:text-stone-400">
                Baseado nas quantidades mínimas necessárias para suas receitas cadastradas
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 rounded-xl hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors min-h-[38px] min-w-[38px] flex items-center justify-center cursor-pointer"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Metrics Bar */}
        <div className="grid grid-cols-3 gap-2 p-3 sm:px-6 bg-stone-100/70 dark:bg-stone-950/50 border-b border-stone-100 dark:border-stone-800 text-center shrink-0">
          <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200/80 dark:border-rose-900/60">
            <div className="flex items-center justify-center gap-1 text-rose-700 dark:text-rose-400 text-xs font-bold">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>Zerados</span>
            </div>
            <strong className="text-lg font-extrabold text-rose-800 dark:text-rose-300 tabular-nums">
              {zeroItems.length}
            </strong>
          </div>

          <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-900/60">
            <div className="flex items-center justify-center gap-1 text-amber-800 dark:text-amber-400 text-xs font-bold">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Nível Baixo</span>
            </div>
            <strong className="text-lg font-extrabold text-amber-900 dark:text-amber-300 tabular-nums">
              {lowItems.length}
            </strong>
          </div>

          <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-900/60">
            <div className="flex items-center justify-center gap-1 text-emerald-700 dark:text-emerald-400 text-xs font-bold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Suficientes</span>
            </div>
            <strong className="text-lg font-extrabold text-emerald-800 dark:text-emerald-300 tabular-nums">
              {okItems.length}
            </strong>
          </div>
        </div>

        {/* Tab Toggle: Visual Cards vs Plain Text */}
        <div className="px-4 sm:px-6 pt-3 flex items-center justify-between shrink-0">
          <div className="inline-flex rounded-xl bg-stone-100 dark:bg-stone-800 p-1 border border-stone-200/60 dark:border-stone-700/60 text-xs">
            <button
              onClick={() => setViewMode('cards')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                viewMode === 'cards'
                  ? 'bg-white dark:bg-stone-900 text-amber-800 dark:text-amber-400 shadow-2xs'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
              }`}
            >
              Cards Detalhados
            </button>
            <button
              onClick={() => setViewMode('text')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1 cursor-pointer ${
                viewMode === 'text'
                  ? 'bg-white dark:bg-stone-900 text-amber-800 dark:text-amber-400 shadow-2xs'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Texto para WhatsApp</span>
            </button>
          </div>

          <span className="text-[11px] text-stone-500 dark:text-stone-400">
            {zeroItems.length + lowItems.length === 0
              ? 'Tudo em dia'
              : `${zeroItems.length + lowItems.length} para repor`}
          </span>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {viewMode === 'text' ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-stone-600 dark:text-stone-400">
                <span>Texto pré-formatado pronto para cópia ou envio:</span>
                <span className="text-[11px] text-stone-400">Compatível com WhatsApp e Bloco de Notas</span>
              </div>
              <textarea
                readOnly
                value={reportText}
                rows={12}
                className="w-full p-3.5 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-2xl text-xs sm:text-sm font-mono text-stone-800 dark:text-stone-200 leading-relaxed focus:outline-none select-all"
              />
            </div>
          ) : (
            <>
              {zeroItems.length === 0 && lowItems.length === 0 ? (
                <div className="py-8 px-4 text-center space-y-2 bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/60 rounded-2xl">
                  <CheckCircle2 className="w-12 h-12 text-emerald-600 dark:text-emerald-400 mx-auto" />
                  <h3 className="text-base font-bold text-emerald-950 dark:text-emerald-200 font-display">
                    Estoque 100% Abastecido!
                  </h3>
                  <p className="text-xs sm:text-sm text-emerald-800/80 dark:text-emerald-300/80 max-w-md mx-auto">
                    Nenhum ingrediente está zerado ou abaixo do mínimo calculado a partir das receitas cadastradas.
                  </p>
                </div>
              ) : (
                <div className="space-y-5">
                  {/* Zerados Section */}
                  {zeroItems.length > 0 && (
                    <div className="space-y-2.5">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                        <h3 className="text-xs font-bold uppercase tracking-wider text-rose-950 dark:text-rose-300 font-display">
                          Estoque Zerado ({zeroItems.length})
                        </h3>
                      </div>

                      <div className="space-y-2">
                        {zeroItems.map((item) => {
                          const u = item.ingredient.unit;
                          return (
                            <div
                              key={item.ingredient.id}
                              className="p-3 bg-rose-50/30 dark:bg-rose-950/20 border border-rose-200/90 dark:border-rose-900/70 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                            >
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <h4 className="text-sm font-bold text-stone-900 dark:text-stone-100 truncate">
                                    {item.ingredient.name}
                                  </h4>
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300 dark:border-rose-800 shrink-0">
                                    ZERADO
                                  </span>
                                </div>

                                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-stone-600 dark:text-stone-400 mt-1">
                                  <span>
                                    Mínimo necessário: <strong>{formatNumber(item.minStock, u === 'g' || u === 'ml' ? 0 : 2)} {u}</strong>
                                  </span>
                                  {item.recipesUsing.length > 0 && (
                                    <span className="text-[11px] text-stone-500 dark:text-stone-400">
                                      · Usado em {item.recipesUsing.length} receita(s) ({item.recipesUsing.map((r) => r.recipeName).join(', ')})
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0 pt-1 sm:pt-0 border-t sm:border-t-0 border-rose-200/50 dark:border-rose-900/50">
                                <span className="text-xs text-rose-700 dark:text-rose-400 font-bold tabular-nums">
                                  Falta comprar: {formatNumber(item.deficit, u === 'g' || u === 'ml' ? 0 : 2)} {u}
                                </span>

                                <div className="flex items-center gap-1.5">
                                  {onSaveIngredient && (
                                    <div className="flex items-center gap-1 bg-white dark:bg-stone-800 p-0.5 rounded-lg border border-stone-200 dark:border-stone-700">
                                      <button
                                        type="button"
                                        onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); }}
                                        onClick={(e) => handleQuickAdjustStock(e, item.ingredient, -getStepForUnit(item.ingredient.unit))}
                                        disabled={(item.ingredient.stock ?? 0) <= 0}
                                        className="w-6 h-6 rounded flex items-center justify-center font-bold text-xs bg-stone-100 dark:bg-stone-700 hover:bg-stone-200 text-stone-700 dark:text-stone-200 disabled:opacity-30 cursor-pointer"
                                        title="Diminuir estoque"
                                      >
                                        -
                                      </button>
                                      <span className="px-1 text-xs font-bold tabular-nums">
                                        {formatNumber(item.currentStock, u === 'g' || u === 'ml' ? 0 : 2)} {u}
                                      </span>
                                      <button
                                        type="button"
                                        onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); }}
                                        onClick={(e) => handleQuickAdjustStock(e, item.ingredient, getStepForUnit(item.ingredient.unit))}
                                        className="w-6 h-6 rounded flex items-center justify-center font-bold text-xs bg-stone-100 dark:bg-stone-700 hover:bg-stone-200 text-stone-700 dark:text-stone-200 cursor-pointer"
                                        title="Adicionar ao estoque"
                                      >
                                        +
                                      </button>
                                    </div>
                                  )}
                                  {onEditIngredient && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        onClose();
                                        onEditIngredient(item.ingredient);
                                      }}
                                      className="p-1 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-900/40 text-amber-700 dark:text-amber-400 text-xs font-semibold cursor-pointer"
                                      title="Editar ingrediente no catálogo"
                                    >
                                      <Pencil className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Baixos Section */}
                  {lowItems.length > 0 && (
                    <div className="space-y-2.5">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                        <h3 className="text-xs font-bold uppercase tracking-wider text-amber-950 dark:text-amber-300 font-display">
                          Estoque Baixo ({lowItems.length})
                        </h3>
                      </div>

                      <div className="space-y-2">
                        {lowItems.map((item) => {
                          const u = item.ingredient.unit;
                          return (
                            <div
                              key={item.ingredient.id}
                              className="p-3 bg-amber-50/30 dark:bg-amber-950/20 border border-amber-200/90 dark:border-amber-900/70 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                            >
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <h4 className="text-sm font-bold text-stone-900 dark:text-stone-100 truncate">
                                    {item.ingredient.name}
                                  </h4>
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800 shrink-0">
                                    NÍVEL BAIXO
                                  </span>
                                </div>

                                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-stone-600 dark:text-stone-400 mt-1">
                                  <span>
                                    Estoque atual: <strong>{formatNumber(item.currentStock, u === 'g' || u === 'ml' ? 0 : 2)} {u}</strong>
                                  </span>
                                  <span>
                                    · Mínimo: <strong>{formatNumber(item.minStock, u === 'g' || u === 'ml' ? 0 : 2)} {u}</strong>
                                  </span>
                                  {item.recipesUsing.length > 0 && (
                                    <span className="text-[11px] text-stone-500 dark:text-stone-400">
                                      · {item.recipesUsing.map((r) => r.recipeName).join(', ')}
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0 pt-1 sm:pt-0 border-t sm:border-t-0 border-amber-200/50 dark:border-amber-900/50">
                                <span className="text-xs text-amber-800 dark:text-amber-300 font-bold tabular-nums">
                                  Falta comprar: {formatNumber(item.deficit, u === 'g' || u === 'ml' ? 0 : 2)} {u}
                                </span>

                                <div className="flex items-center gap-1.5">
                                  {onSaveIngredient && (
                                    <div className="flex items-center gap-1 bg-white dark:bg-stone-800 p-0.5 rounded-lg border border-stone-200 dark:border-stone-700">
                                      <button
                                        type="button"
                                        onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); }}
                                        onClick={(e) => handleQuickAdjustStock(e, item.ingredient, -getStepForUnit(item.ingredient.unit))}
                                        disabled={(item.ingredient.stock ?? 0) <= 0}
                                        className="w-6 h-6 rounded flex items-center justify-center font-bold text-xs bg-stone-100 dark:bg-stone-700 hover:bg-stone-200 text-stone-700 dark:text-stone-200 disabled:opacity-30 cursor-pointer"
                                        title="Diminuir estoque"
                                      >
                                        -
                                      </button>
                                      <span className="px-1 text-xs font-bold tabular-nums">
                                        {formatNumber(item.currentStock, u === 'g' || u === 'ml' ? 0 : 2)} {u}
                                      </span>
                                      <button
                                        type="button"
                                        onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); }}
                                        onClick={(e) => handleQuickAdjustStock(e, item.ingredient, getStepForUnit(item.ingredient.unit))}
                                        className="w-6 h-6 rounded flex items-center justify-center font-bold text-xs bg-stone-100 dark:bg-stone-700 hover:bg-stone-200 text-stone-700 dark:text-stone-200 cursor-pointer"
                                        title="Adicionar ao estoque"
                                      >
                                        +
                                      </button>
                                    </div>
                                  )}
                                  {onEditIngredient && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        onClose();
                                        onEditIngredient(item.ingredient);
                                      }}
                                      className="p-1 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-900/40 text-amber-700 dark:text-amber-400 text-xs font-semibold cursor-pointer"
                                      title="Editar ingrediente no catálogo"
                                    >
                                      <Pencil className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:px-6 bg-stone-50 dark:bg-stone-900 border-t border-stone-100 dark:border-stone-800 flex flex-wrap items-center justify-between gap-2.5 shrink-0">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleWhatsAppShare}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl shadow-xs transition-all active:scale-[0.98] min-h-[40px]"
              title="Compartilhar resumo completo no WhatsApp"
            >
              <MessageCircle className="w-4 h-4 shrink-0" />
              <span>Enviar no WhatsApp</span>
            </button>

            <button
              onClick={handleCopyText}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-stone-800 dark:text-stone-200 bg-white dark:bg-stone-800 hover:bg-stone-100 dark:hover:bg-stone-700 border border-stone-200 dark:border-stone-700 rounded-xl transition-all active:scale-[0.98] min-h-[40px]"
              title="Copiar texto formatado para a área de transferência"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span className="text-emerald-700 dark:text-emerald-400">Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-stone-500 shrink-0" />
                  <span>Copiar Texto</span>
                </>
              )}
            </button>

            {onNavigateToScale && (
              <button
                onClick={() => {
                  onClose();
                  onNavigateToScale();
                }}
                className="hidden sm:flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-amber-900 dark:text-amber-200 bg-amber-100 dark:bg-amber-950/60 hover:bg-amber-200 dark:hover:bg-amber-900/60 border border-amber-300 dark:border-amber-800 rounded-xl transition-colors min-h-[40px]"
                title="Ir para a Lista de Compras / Escalonar Produção"
              >
                <ShoppingBag className="w-4 h-4 text-amber-700 dark:text-amber-400 shrink-0" />
                <span>Ver Lista de Compras</span>
              </button>
            )}
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-xl transition-colors min-h-[40px]"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
