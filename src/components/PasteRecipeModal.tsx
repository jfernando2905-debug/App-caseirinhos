import React, { useState } from 'react';
import { Sparkles, X, AlertCircle, Check, Loader2, BookOpen, ArrowRight, Wand2 } from 'lucide-react';
import { Ingredient, Recipe, ParsedRecipe, AppSettings } from '../types';
import { parseRecipeLocally } from '../utils/localRecipeParser';
import { formatNumber } from '../utils/calculations';
import { uid } from '../utils/storage';

interface PasteRecipeModalProps {
  isOpen: boolean;
  onClose: () => void;
  ingredients: Ingredient[];
  cfg: AppSettings;
  onRecipeCreated: (recipe: Recipe, newIngredientsCount: number) => void;
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

  const handleInterpret = async () => {
    if (!recipeText.trim()) {
      setErrorMsg('Cole o texto da receita primeiro.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      // 1. Try server Gemini API first
      const response = await fetch('/api/parse-recipe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: recipeText,
          existingIngredients: ingredients,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data && Array.isArray(data.itens) && data.itens.length > 0) {
          setParsedData(data);
          setLoading(false);
          return;
        }
      }

      // 2. If Gemini endpoint fails or is offline, use intelligent local parser
      console.log('Using local recipe parser fallback...');
      const localResult = parseRecipeLocally(recipeText, ingredients);
      if (!localResult.itens.length) {
        setErrorMsg('Não foi possível identificar ingredientes no texto colado. Verifique o formato.');
      } else {
        setParsedData(localResult);
      }
    } catch (err: any) {
      console.warn('Network or AI error, falling back to local Portuguese recipe parser:', err);
      const localResult = parseRecipeLocally(recipeText, ingredients);
      if (!localResult.itens.length) {
        setErrorMsg('Erro ao interpretar: ' + (err.message || 'Formato não reconhecido'));
      } else {
        setParsedData(localResult);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRecipe = () => {
    if (!parsedData) return;

    let newIngsCount = 0;
    const finalItems = parsedData.itens.map((it) => {
      // Find matching ingredient
      let matched = it.id ? ingredients.find((i) => i.id === it.id) : null;
      if (!matched) {
        matched = ingredients.find(
          (i) => i.name.toLowerCase().trim() === it.nome.toLowerCase().trim()
        );
      }

      let ingredientId = matched ? matched.id : '';

      // If new, create it in state
      if (!matched) {
        const newId = uid();
        const newIng: Ingredient = {
          id: newId,
          name: it.nome,
          price: 0,
          size: 1,
          unit: it.unidade,
          hist: [],
          category: 'Receita Colada',
        };
        ingredients.push(newIng);
        ingredientId = newId;
        newIngsCount++;
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

    onRecipeCreated(newRecipe, newIngsCount);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-stone-200 my-8 max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-stone-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-stone-900 font-display">
                Colar Receita Inteligente
              </h3>
              <p className="text-xs text-stone-500">
                Cole ingredientes e modo de preparo de qualquer site ou mensagem
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-stone-100 flex items-center justify-center text-stone-400 hover:text-stone-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4">
          {!parsedData ? (
            <>
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
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
                  className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl text-xs sm:text-sm font-sans focus:bg-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                />
              </div>

              {errorMsg && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-3 text-xs text-amber-900 space-y-1">
                <p className="font-semibold flex items-center gap-1.5">
                  <Wand2 className="w-3.5 h-3.5 text-amber-700" />
                  <span>Conversão Automática de Medidas Caseiras:</span>
                </p>
                <p className="text-amber-800/80">
                  Xícaras, copos e colheres são convertidos para gramas (g) ou mililitros (ml) com densidade exata para confeitaria.
                </p>
              </div>
            </>
          ) : (
            /* Parsed Preview */
            <div className="space-y-4">
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
                <h4 className="text-base font-bold text-stone-900 font-display">
                  {parsedData.nome || 'Bolo Reconhecido'}
                </h4>
                <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-stone-600 mt-1">
                  <span>Rendimento: <strong>{formatNumber(parsedData.rendimento || 12)} fatias</strong></span>
                  <span>·</span>
                  <span>Tempo de forno: <strong>{parsedData.tempo_min || 40} min</strong></span>
                  <span>·</span>
                  <span>Temperatura: <strong>{parsedData.temp || '180'}°C</strong></span>
                </div>
              </div>

              <div>
                <h5 className="text-xs font-bold text-stone-800 uppercase tracking-wider mb-2">
                  Ingredientes Identificados ({parsedData.itens.length}):
                </h5>

                <div className="border border-stone-200 rounded-xl overflow-hidden text-xs">
                  <table className="w-full text-left">
                    <thead className="bg-stone-50 border-b border-stone-200 text-stone-600">
                      <tr>
                        <th className="py-2 px-3 font-semibold">Ingrediente</th>
                        <th className="py-2 px-3 font-semibold text-right">Qtd Convertida</th>
                        <th className="py-2 px-3 font-semibold text-center">Cadastro</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {parsedData.itens.map((it, idx) => {
                        const isRegistered =
                          (it.id && ingredients.some((i) => i.id === it.id)) ||
                          ingredients.some(
                            (i) => i.name.toLowerCase().trim() === it.nome.toLowerCase().trim()
                          );

                        return (
                          <tr key={idx} className="hover:bg-stone-50">
                            <td className="py-2 px-3 font-medium text-stone-900">{it.nome}</td>
                            <td className="py-2 px-3 text-right tabular-nums font-semibold text-amber-900">
                              {formatNumber(it.qtd)} {it.unidade}
                            </td>
                            <td className="py-2 px-3 text-center">
                              {isRegistered ? (
                                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                                  <Check className="w-3 h-3" />
                                  Já no estoque
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md">
                                  Novo (sem preço)
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <p className="text-[11px] text-stone-500">
                Ingredientes novos serão criados no seu catálogo. Você poderá preencher o preço pago deles a qualquer momento na aba Ingredientes.
              </p>
            </div>
          )}
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-between gap-3 pt-3 border-t border-stone-100">
          {!parsedData ? (
            <>
              <button
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-xl transition-colors min-h-[42px]"
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
                    <span>Interpretando receita...</span>
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
                className="px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-xl transition-colors min-h-[42px]"
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
