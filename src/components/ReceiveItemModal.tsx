import React, { useState, useEffect } from 'react';
import { X, PackageCheck, Boxes, AlertCircle, ArrowRight } from 'lucide-react';
import { Unit } from '../types';
import { NumericInput } from './NumericInput';
import { formatNumber } from '../utils/calculations';

interface AggregatedIngredientRef {
  id: string;
  name: string;
  category?: string;
  baseQty: number;
  baseUnit: Unit;
  packagesNeeded: number;
  ing?: any;
}

interface ReceiveItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: AggregatedIngredientRef | null;
  onConfirmReceipt: (
    item: AggregatedIngredientRef,
    receivedQty: number,
    receivedUnit: Unit
  ) => void;
}

export const ReceiveItemModal: React.FC<ReceiveItemModalProps> = ({
  isOpen,
  onClose,
  item,
  onConfirmReceipt,
}) => {
  const [receivedQty, setReceivedQty] = useState<number>(0);
  const [receivedUnit, setReceivedUnit] = useState<Unit>('kg');
  const [errorMsg, setErrorMsg] = useState<string>('');

  useEffect(() => {
    if (item && item.ing) {
      const stockUnit: Unit = item.ing.unit || 'kg';
      setReceivedUnit(stockUnit);

      // Pre-fill expected quantity based on package count or base quantity
      if (item.ing.size > 0 && item.packagesNeeded > 0) {
        setReceivedQty(item.packagesNeeded * item.ing.size);
      } else if (item.baseUnit === stockUnit) {
        setReceivedQty(item.baseQty);
      } else if (item.baseUnit === 'g' && stockUnit === 'kg') {
        setReceivedQty(item.baseQty / 1000);
      } else if (item.baseUnit === 'ml' && stockUnit === 'L') {
        setReceivedQty(item.baseQty / 1000);
      } else if (item.baseUnit === 'kg' && stockUnit === 'g') {
        setReceivedQty(item.baseQty * 1000);
      } else if (item.baseUnit === 'L' && stockUnit === 'ml') {
        setReceivedQty(item.baseQty * 1000);
      } else {
        setReceivedQty(item.baseQty);
      }
      setErrorMsg('');
    }
  }, [item]);

  if (!isOpen || !item || !item.ing) return null;

  const currentStock = typeof item.ing.stock === 'number' ? item.ing.stock : 0;
  const targetStockUnit: Unit = item.ing.unit || 'kg';

  // Calculate projected new stock
  let projectedAdditionInStockUnit = receivedQty;
  if (receivedUnit === 'g' && targetStockUnit === 'kg') {
    projectedAdditionInStockUnit = receivedQty / 1000;
  } else if (receivedUnit === 'ml' && targetStockUnit === 'L') {
    projectedAdditionInStockUnit = receivedQty / 1000;
  } else if (receivedUnit === 'kg' && targetStockUnit === 'g') {
    projectedAdditionInStockUnit = receivedQty * 1000;
  } else if (receivedUnit === 'L' && targetStockUnit === 'ml') {
    projectedAdditionInStockUnit = receivedQty * 1000;
  }

  const projectedNewStock = currentStock + projectedAdditionInStockUnit;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (receivedQty <= 0) {
      setErrorMsg('A quantidade recebida deve ser maior que zero.');
      return;
    }
    onConfirmReceipt(item, receivedQty, receivedUnit);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-stone-200 dark:border-stone-800 my-6 animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-stone-100 dark:border-stone-800 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 flex items-center justify-center font-bold">
              <PackageCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-stone-900 dark:text-stone-100 font-display">
                Confirmar Recebimento
              </h3>
              <p className="text-[11px] text-stone-500 dark:text-stone-400">
                Dar entrada no estoque de ingredientes
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl hover:bg-stone-100 dark:hover:bg-stone-800 flex items-center justify-center text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 transition-colors min-h-[38px] min-w-[38px]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 mb-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-800 dark:text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Ingredient Header Info */}
          <div className="p-3.5 bg-stone-50 dark:bg-stone-800/60 border border-stone-200/80 dark:border-stone-700/80 rounded-2xl space-y-1">
            <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block">
              {item.category || 'Geral'}
            </span>
            <h4 className="text-base font-bold text-stone-900 dark:text-stone-100 font-display">
              {item.name}
            </h4>
            <p className="text-xs text-stone-600 dark:text-stone-300 pt-1">
              Embalagem padrão: <strong>{formatNumber(item.ing.size)} {item.ing.unit}</strong> (R$ {item.ing.price.toFixed(2)})
            </p>
          </div>

          {/* Received Quantity Inputs */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
              Quantidade Efetivamente Recebida *
            </label>
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <NumericInput
                  value={receivedQty}
                  onChange={(val) => setReceivedQty(val)}
                  placeholder="0"
                  min={0.001}
                  maxDecimals={3}
                  className="px-3.5 py-2.5 bg-white dark:bg-stone-800 border border-emerald-300 dark:border-emerald-700 text-stone-900 dark:text-stone-100 rounded-xl text-base font-bold tabular-nums text-right focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 min-h-[44px]"
                />
              </div>

              <select
                value={receivedUnit}
                onChange={(e) => setReceivedUnit(e.target.value as Unit)}
                className="w-24 px-2.5 py-2.5 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 rounded-xl text-sm font-semibold focus:border-emerald-500 min-h-[44px]"
              >
                <option value="kg">kg</option>
                <option value="g">g</option>
                <option value="L">L</option>
                <option value="ml">ml</option>
                <option value="un">un</option>
              </select>
            </div>
            <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-1">
              Confira ou ajuste a quantidade recebida caso tenha comprado mais ou menos embalagens.
            </p>
          </div>

          {/* Stock Impact Preview Card */}
          <div className="p-3.5 bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/60 rounded-2xl space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-900 dark:text-emerald-300">
              <Boxes className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Impacto Imediato no Estoque</span>
            </div>

            <div className="flex items-center justify-between text-xs pt-1">
              <div>
                <span className="text-stone-500 dark:text-stone-400 block text-[10px]">Estoque Atual</span>
                <strong className="text-stone-800 dark:text-stone-200 tabular-nums">
                  {formatNumber(currentStock, targetStockUnit === 'g' || targetStockUnit === 'ml' ? 0 : 2)} {targetStockUnit}
                </strong>
              </div>

              <ArrowRight className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />

              <div>
                <span className="text-stone-500 dark:text-stone-400 block text-[10px]">Entrada (+ {formatNumber(projectedAdditionInStockUnit, targetStockUnit === 'g' || targetStockUnit === 'ml' ? 0 : 2)} {targetStockUnit})</span>
                <strong className="text-emerald-700 dark:text-emerald-400 font-extrabold text-sm tabular-nums">
                  {formatNumber(projectedNewStock, targetStockUnit === 'g' || targetStockUnit === 'ml' ? 0 : 2)} {targetStockUnit}
                </strong>
              </div>
            </div>
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-100 dark:border-stone-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-xl transition-colors min-h-[42px]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl transition-colors min-h-[42px] shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <PackageCheck className="w-4 h-4" />
              <span>Confirmar e Adicionar</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
