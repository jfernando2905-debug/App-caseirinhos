import React, { useState } from 'react';
import { Sparkles, X, AlertCircle, Check, Loader2, Wand2, Link2, PlusCircle, CheckCircle2 } from 'lucide-react';
import { Ingredient, Recipe, ParsedRecipe, AppSettings } from '../types';
import { parseRecipeLocally } from '../utils/localRecipeParser';
import { formatNumber } from '../utils/calculations';
import { uid } from '../utils/storage';
import { findBestIngredientMatch, normalizeText } from '../utils/ingredientMatcher';

interface PasteRecipeModalProps {
  isOpen: boolean;
  onClose: () => void;
  ingredients: Ingredient[];
  cfg: AppSettings;
  onRecipeCreated: (recipe: Recipe, newIngredients: Ingredient[]) => void;
}

export const PasteRecipeModal: React.FC<PasteRecipeModalProps> = ({
  isOpen,
  onClose,
  ingredients,
  cfg,
  onRecipeCreated,
}) => {
  const [recipeText, setRecipeText] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [parsedData, setParsedData] = useState<ParsedRecipe | null>(null);

  if (!isOpen) return null;

  // Process raw AI or local result: intelligently bind to existing ingredients if not already bound
  const linkItemsToExisting = (rawResult: ParsedRecipe): ParsedRecipe => {
    const enrichedItens = rawResult.itens.map((it) => {
      // 1. If AI already provided a valid ID, check if it exists in ingredients
      let matched = it.id ? ingredients.find((i) => i.id === it.id) : null;

      // 2. If no valid match by ID, run smart fuzzy/synonym search in registered ingredients
      if (!matched) {
        matched = findBestIngredientMatch(it.nome, it.unidade, ingredients);
      }

      if (matched) {
        return {
          ...it,
          id: matched.id,
          nome: matched.name, // Use registered canonical name
          unidade: (matched.unit as 'g' | 'ml' | 'un') || it.unidade,
        };
      }

      return {
        ...it,
        id: null,
      };
    });

    return {
      ...rawResult,
      itens: enrichedItens,
    };
  };

  const handleInterpret = async () => {
    if (!recipeText.trim()) {
      setErrorMsg('Cole o texto da receita primeiro.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      // 1. Try server Gemini API first, sending the registered ingredients list
      const response = await fetch('/api/parse-recipe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: recipeText,
          existingIngredients: ingredients.map((i) => ({
            id: i.id,
            name: i.name,
            unit: i.unit,
            category: i.category,
          })),
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data && Array.isArray(data.itens) && data.itens.length > 0) {
          const linked = linkItemsToExisting(data);
          setParsedData(linked);
          setLoading(false);
          return;
        }
      }

      // 2. If Gemini endpoint fails or is offline, use intelligent local parser
      console.log('Using local recipe parser with ingredient deduplication...');
      const localResult = parseRecipeLocally(recipeText, ingredients);
      if (!localResult.itens.length) {
        setErrorMsg('Não foi possível identificar ingredientes no texto colado. Verifique o formato.');
      } else {
        const linked = linkItemsToExisting(localResult);
        setParsedData(linked);
      }
    } catch (err: any) {
      console.warn('Network or AI error, falling back to local Portuguese recipe parser:', err);
      const localResult = parseRecipeLocally(recipeText, ingredients);
      if (!localResult.itens.length) {
        setErrorMsg('Erro ao interpretar: ' + (err.message || 'Formato não reconhecido'));
      } else {
        const linked = linkItemsToExisting(localResult);
        setParsedData(linked);
      }
    } finally {
      setLoading(false);
    }
  };

  // Change mapping of a single item in the preview table
  const handleItemMappingChange = (index: number, selectedValue: string) => {
    if (!parsedData) return;

    const updatedItens = [...parsedData.itens];
    const current = updatedItens[index];

    if (selectedValue === '__new__') {
      updatedItens[index] = {
        ...current,
        id: null,
      };
    } else {
      const selectedIng = ingredients.find((i) => i.id === selectedValue);
      if (selectedIng) {
        updatedItens[index] = {
          ...current,
          id: selectedIng.id,
          nome: selectedIng.name,
          unidade: (selectedIng.unit as 'g' | 'ml' | 'un') || current.unidade,
        };
      }
    }

    setParsedData({
      ...parsedData,
      itens: updatedItens,
    });
  };

  const handleCreateRecipe = () => {
    if (!parsedData) return;

    const newIngredientsCreated: Ingredient[] = [];

    const finalItems = parsedData.itens.map((it) => {
      // 1. Find matching ingredient from registered catalogue
      let matched = it.id ? ingredients.find((i) => i.id === it.id) : null;
      if (!matched) {
        matched = findBestIngredientMatch(it.nome, it.unidade, ingredients);
      }

      // 2. Avoid creating duplicates within this same batch
      if (!matched) {
        const alreadyCreatedInBatch = newIngredientsCreated.find(
          (ni) => normalizeText(ni.name) === normalizeText(it.nome)
        );
        if (alreadyCreatedInBatch) {
          matched = alreadyCreatedInBatch;
        }
      }

      let ingredientId = matched ? matched.id : '';

      // 3. If genuinely new, create it
      if (!matched) {
        const newId = uid();
        const newIng: Ingredient = {
          id: newId,
          name: it.nome,
          price: 0,
          size: it.unidade === 'un' ? 1 : 1000,
          unit: it.unidade,
          hist: [],
          category: 'Receita Importada',
        };
        newIngredientsCreated.push(newIng);
        ingredientId = newId;
      }

      return {
        ing: ingredientId,
        qty: it.qtd || 100,
        unit: it.unidade,
      };
    });

    const newRecipe: Recipe = {
      id: uid(),
      name: parsedData.nome || 'Bolo Importado',
      yield: parsedData.rendimento || 12,
      margin: cfg.margin || 60,
      time: parsedData.tempo_min || 40,
      temp: parsedData.temp || '180',
      fuel: 0.5,
      pack: 3.5,
      sell: 0,
      items: finalItems,
      equip: [{ nome: 'Liquidificador', w: 600, min: 4 }],
      sizes: [
        { id: uid(), nome: 'P', k: 1, pack: 2.8, sell: 0 },
        { id: uid(), nome: 'M', k: 1.6, pack: 3.5, sell: 0 },
      ],
      category: 'Receitas Importadas',
    };

    onRecipeCreated(newRecipe, newIngredientsCreated);
    onClose();
  };

  // Sort ingredients alphabetically for the selector dropdown
  const sortedIngredients = [...ingredients].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-stone-200 dark:border-stone-800 my-8 max-h-[92vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-stone-100 dark:border-stone-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-stone-900 dark:text-stone-100 font-display">
                Colar Receita com IA
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                A IA analisa o texto e busca automaticamente nos seus ingredientes já cadastrados
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 flex items-center justify-center text-stone-400 hover:text-stone-600 dark:hover:text-stone-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4">
          {!parsedData ? (
            <>
              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Texto da Receita
                </label>
                <textarea
                  rows={9}
                  value={recipeText}
                  onChange={(e) => setRecipeText(e.target.value)}
                  placeholder={`Cole aqui o texto. Exemplo:

BOLO DE FUBÁ CREMOSO
Rendimento: 12 fatias
Tempo de forno: 45 minutos a 180°C

Ingredientes:
• 3 ovos
• 2 xícaras de leite
• 1 xícara e meia de açúcar
• 1 xícara de fubá mimoso
• 2 colheres de sopa de manteiga
• 1 colher de sopa de fermento químico`}
                  className="w-full p-3 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500 rounded-xl text-xs sm:text-sm font-sans focus:bg-white dark:focus:bg-stone-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                />
              </div>

              {errorMsg && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-800 dark:text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-900/50 rounded-xl p-3 text-xs text-emerald-950 dark:text-emerald-300 space-y-1">
                <p className="font-semibold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Busca Anti-Duplicidade no Catálogo ({ingredients.length} cadastrados):</span>
                </p>
                <p className="text-emerald-800/90 dark:text-emerald-400/90 leading-relaxed">
                  A IA compara cada ingrediente da receita com seus ingredientes já existentes (sinônimos, marcas e singular/plural), aproveitando os preços já calculados para não criar itens repetidos.
                </p>
              </div>

              <div className="bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/50 rounded-xl p-3 text-xs text-amber-900 dark:text-amber-300 space-y-1">
                <p className="font-semibold flex items-center gap-1.5">
                  <Wand2 className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
                  <span>Conversão Automática de Medidas Caseiras:</span>
                </p>
                <p className="text-amber-800/80 dark:text-amber-400/80">
                  Xícaras, copos e colheres são convertidos com densidade exata para gramas (g), mililitros (ml) ou unidades (un).
                </p>
              </div>
            </>
          ) : (
            /* Parsed Preview */
            <div className="space-y-4">
              <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 rounded-xl">
                <h4 className="text-base font-bold text-stone-900 dark:text-stone-100 font-display">
                  {parsedData.nome || 'Bolo Reconhecido'}
                </h4>
                <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-stone-600 dark:text-stone-300 mt-1">
                  <span>Rendimento: <strong>{formatNumber(parsedData.rendimento || 12)} fatias</strong></span>
                  <span>·</span>
                  <span>Tempo de forno: <strong>{parsedData.tempo_min || 40} min</strong></span>
                  <span>·</span>
                  <span>Temperatura: <strong>{parsedData.temp || '180'}°C</strong></span>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <h5 className="text-xs font-bold text-stone-800 dark:text-stone-200 uppercase tracking-wider">
                    Ingredientes Identificados ({parsedData.itens.length}):
                  </h5>
                  <span className="text-[11px] text-stone-500 dark:text-stone-400">
                    {parsedData.itens.filter((it) => it.id).length} vinculados ao estoque ·{' '}
                    {parsedData.itens.filter((it) => !it.id).length} novos
                  </span>
                </div>

                <div className="border border-stone-200 dark:border-stone-700 rounded-xl overflow-hidden text-xs">
                  <div className="max-h-72 overflow-y-auto">
                    <table className="w-full text-left">
                      <thead className="bg-stone-50 dark:bg-stone-800 sticky top-0 border-b border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 z-10">
                        <tr>
                          <th className="py-2.5 px-3 font-semibold">Ingrediente da Receita</th>
                          <th className="py-2.5 px-3 font-semibold text-right">Qtd</th>
                          <th className="py-2.5 px-3 font-semibold">Vínculo com Estoque</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                        {parsedData.itens.map((it, idx) => {
                          const matchedIng = it.id ? ingredients.find((i) => i.id === it.id) : null;

                          return (
                            <tr key={idx} className="hover:bg-stone-50 dark:hover:bg-stone-800/50">
                              <td className="py-2.5 px-3">
                                <div className="font-medium text-stone-900 dark:text-stone-100">{it.nome}</div>
                                {matchedIng && (
                                  <div className="text-[10px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 mt-0.5">
                                    <Link2 className="w-2.5 h-2.5 shrink-0" />
                                    <span>Cadastrado como: <strong>{matchedIng.name}</strong></span>
                                  </div>
                                )}
                              </td>
                              <td className="py-2.5 px-3 text-right tabular-nums font-semibold text-amber-900 dark:text-amber-300 whitespace-nowrap">
                                {formatNumber(it.qtd)} {it.unidade}
                              </td>
                              <td className="py-2.5 px-3">
                                <select
                                  value={it.id || '__new__'}
                                  onChange={(e) => handleItemMappingChange(idx, e.target.value)}
                                  className={`w-full max-w-xs text-xs py-1 px-2 rounded-lg border font-medium transition-colors ${
                                    it.id
                                      ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                                      : 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-300'
                                  }`}
                                >
                                  {matchedIng && (
                                    <option value={matchedIng.id}>
                                      ✓ {matchedIng.name} (já no estoque)
                                    </option>
                                  )}
                                  <option value="__new__">+ Criar como Novo Ingrediente</option>
                                  <optgroup label="Vincular a ingrediente existente:">
                                    {sortedIngredients.map((ing) => (
                                      <option key={ing.id} value={ing.id}>
                                        {ing.name} ({ing.unit})
                                      </option>
                                    ))}
                                  </optgroup>
                                </select>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <div className="bg-stone-50 dark:bg-stone-800/60 p-3 rounded-xl border border-stone-200 dark:border-stone-700 text-[11px] text-stone-500 dark:text-stone-400 flex items-start gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  Ingredientes vinculados reaproveitam o preço de compra e custos já existentes. Novos ingredientes serão criados sem duplicar os existentes.
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-between gap-3 pt-3 border-t border-stone-100 dark:border-stone-800">
          {!parsedData ? (
            <>
              <button
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-xl transition-colors min-h-[42px]"
              >
                Cancelar
              </button>
              <button
                disabled={loading}
                onClick={handleInterpret}
                className="flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-500 disabled:opacity-50 rounded-xl shadow-xs transition-all min-h-[42px]"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Buscando no cadastro e interpretando...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Interpretar Receita</span>
                  </>
                )}
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setParsedData(null)}
                className="px-4 py-2 text-xs font-semibold text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-xl transition-colors min-h-[42px]"
              >
                Voltar e Colar Outra
              </button>
              <button
                onClick={handleCreateRecipe}
                className="flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl shadow-xs transition-all min-h-[42px]"
              >
                <Check className="w-4 h-4" />
                <span>Confirmar e Criar Receita</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
