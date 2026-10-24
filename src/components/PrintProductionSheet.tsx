import React from 'react';
import { X, Printer, ChefHat, Clock, Flame, CheckSquare, FileDown } from 'lucide-react';
import { Recipe, Ingredient, AppSettings } from '../types';
import { calculateSizeMetrics, getItemCost, formatCurrency, formatNumber } from '../utils/calculations';
import { generateRecipePdf } from '../utils/recipePdf';

interface PrintProductionSheetProps {
  recipe: Recipe;
  ingredients: Ingredient[];
  cfg: AppSettings;
  onClose: () => void;
}

export const PrintProductionSheet: React.FC<PrintProductionSheetProps> = ({
  recipe,
  ingredients,
  cfg,
  onClose,
}) => {
  const sizes = recipe.sizes && recipe.sizes.length > 0
    ? recipe.sizes
    : [{ id: 'default', nome: 'Padrão', k: 1, pack: recipe.pack || 0, sell: recipe.sell || 0 }];

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = () => {
    generateRecipePdf(recipe, ingredients, cfg);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-stone-200 my-8 max-h-[90vh] flex flex-col">
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between pb-3 border-b border-stone-200 no-print">
          <div className="flex items-center gap-2">
            <Printer className="w-5 h-5 text-amber-600" />
            <h3 className="text-base font-bold text-stone-900 font-display">
              Ficha Técnica & Ordem de Produção
            </h3>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadPdf}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-xl transition-all shadow-xs min-h-[38px]"
              title="Baixar arquivo PDF completo da ficha técnica"
            >
              <FileDown className="w-4 h-4 text-amber-600" />
              <span>Baixar PDF</span>
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-500 rounded-xl transition-all shadow-xs min-h-[38px]"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir</span>
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg hover:bg-stone-100 flex items-center justify-center text-stone-400 hover:text-stone-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Document Body */}
        <div className="flex-1 overflow-y-auto py-6 space-y-6 text-stone-900" id="print-area">
          {/* Header */}
          <div className="border-b-2 border-stone-900 pb-4 flex justify-between items-start">
            <div>
              <div className="flex items-center gap-2 text-stone-700 font-semibold text-xs mb-1">
                <ChefHat className="w-4 h-4" />
                <span>FICHA DE CONFEITARIA ARTESANAL</span>
              </div>
              <h1 className="text-2xl font-bold font-display tracking-tight text-stone-900">
                {recipe.name || 'Bolo Sem Nome'}
              </h1>
              {recipe.category && (
                <span className="text-xs text-stone-500">{recipe.category}</span>
              )}
            </div>
            <div className="text-right text-xs text-stone-500">
              <p>Data de emissão: {new Date().toLocaleDateString('pt-BR')}</p>
              <p className="font-semibold text-stone-800">Caseirinhos Fer&Dre</p>
            </div>
          </div>

          {/* Cooking Specifications */}
          <div className="grid grid-cols-3 gap-3 p-3 bg-stone-50 border border-stone-200 rounded-xl text-xs">
            <div>
              <span className="text-stone-500 block">Rendimento base:</span>
              <strong className="text-sm">{formatNumber(recipe.yield)} fatias</strong>
            </div>
            <div>
              <span className="text-stone-500 block">Tempo de Forno:</span>
              <strong className="text-sm">{recipe.time || 0} minutos</strong>
            </div>
            <div>
              <span className="text-stone-500 block">Temperatura:</span>
              <strong className="text-sm">{recipe.temp ? `${recipe.temp}°C` : '180°C'}</strong>
            </div>
          </div>

          {/* Ingredients Table */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-900 mb-2">
              Ingredientes da Receita Base (Fator 1)
            </h3>
            <div className="border border-stone-200 rounded-xl overflow-hidden text-xs">
              <table className="w-full text-left">
                <thead className="bg-stone-100 border-b border-stone-200">
                  <tr>
                    <th className="py-2 px-3 font-semibold">Ingrediente</th>
                    <th className="py-2 px-3 font-semibold text-right">Quantidade</th>
                    <th className="py-2 px-3 font-semibold text-right">Custo Proporcional</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200">
                  {(recipe.items || []).map((it, idx) => {
                    const ing = ingredients.find((i) => i.id === it.ing);
                    const cost = getItemCost(it, ingredients);
                    return (
                      <tr key={idx}>
                        <td className="py-2 px-3 font-medium text-stone-900">
                          {ing?.name || 'Ingrediente'}
                        </td>
                        <td className="py-2 px-3 text-right tabular-nums font-semibold">
                          {formatNumber(it.qty)} {it.unit}
                        </td>
                        <td className="py-2 px-3 text-right tabular-nums text-stone-600">
                          {formatCurrency(cost)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Tamanhos & Custos */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-900 mb-2">
              Tamanhos, Custos e Preços de Venda
            </h3>
            <div className="border border-stone-200 rounded-xl overflow-hidden text-xs">
              <table className="w-full text-left">
                <thead className="bg-stone-100 border-b border-stone-200">
                  <tr>
                    <th className="py-2 px-3 font-semibold">Tamanho</th>
                    <th className="py-2 px-3 font-semibold text-center">Fator (k)</th>
                    <th className="py-2 px-3 font-semibold text-right">Fatias</th>
                    <th className="py-2 px-3 font-semibold text-right">Custo Total</th>
                    <th className="py-2 px-3 font-semibold text-right">Preço Sugerido</th>
                    <th className="py-2 px-3 font-semibold text-right">Preço de Venda</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200">
                  {sizes.map((sz) => {
                    const metrics = calculateSizeMetrics(recipe, sz, cfg, ingredients);
                    return (
                      <tr key={sz.id}>
                        <td className="py-2 px-3 font-bold text-stone-900">{sz.nome}</td>
                        <td className="py-2 px-3 text-center tabular-nums">{formatNumber(sz.k, 2)}×</td>
                        <td className="py-2 px-3 text-right tabular-nums">{formatNumber(metrics.slices, 1)}</td>
                        <td className="py-2 px-3 text-right tabular-nums">{formatCurrency(metrics.totalCost)}</td>
                        <td className="py-2 px-3 text-right tabular-nums font-semibold text-amber-800">
                          {formatCurrency(metrics.suggestedCakePrice)}
                        </td>
                        <td className="py-2 px-3 text-right tabular-nums font-bold text-stone-900">
                          {sz.sell > 0 ? formatCurrency(sz.sell) : formatCurrency(metrics.suggestedCakePrice)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Notes if present */}
          {recipe.notes && (
            <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl text-xs space-y-1">
              <h4 className="font-bold text-stone-900">Observações & Instruções de Preparo:</h4>
              <p className="text-stone-700 whitespace-pre-line">{recipe.notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
