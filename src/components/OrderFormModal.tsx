import React, { useState } from 'react';
import { X, Plus, Trash2, Cake, Calendar, Clock, User, Phone, DollarSign, FileText } from 'lucide-react';
import { Order, OrderItem, OrderStatus, Recipe } from '../types';
import { CAKE_TYPES, CAKE_SIZES, CAKE_FLAVORS } from '../utils/orderShare';
import { NumericInput } from './NumericInput';
import { uid } from '../utils/storage';

interface OrderFormModalProps {
  order: Order | null;
  recipes: Recipe[];
  isOpen: boolean;
  onClose: () => void;
  onSave: (order: Order) => void;
}

export const OrderFormModal: React.FC<OrderFormModalProps> = ({
  order,
  recipes,
  isOpen,
  onClose,
  onSave,
}) => {
  const isEditing = !!order;
  const todayStr = new Date().toISOString().slice(0, 10);

  const [cliente, setCliente] = useState<string>(order ? order.cliente : '');
  const [telefone, setTelefone] = useState<string>(order ? order.telefone || '' : '');
  const [entrega, setEntrega] = useState<string>(order ? order.entrega : todayStr);
  const [hora, setHora] = useState<string>(order ? order.hora || '' : '');
  const [valor, setValor] = useState<number>(order ? order.valor || 0 : 0);
  const [sinal, setSinal] = useState<number>(order ? order.sinal || 0 : 0);
  const [status, setStatus] = useState<OrderStatus>(order ? order.status : 'pendente');
  const [obs, setObs] = useState<string>(order ? order.obs || '' : '');
  const [itens, setItens] = useState<OrderItem[]>(
    order && order.itens && order.itens.length > 0
      ? order.itens.map((it) => ({ ...it }))
      : [{ tipo: CAKE_TYPES[0], tamanho: CAKE_SIZES[3], sabor: CAKE_FLAVORS[0], qtd: 1 }]
  );
  const [errorMsg, setErrorMsg] = useState<string>('');

  if (!isOpen) return null;

  const handleAddItem = () => {
    setItens([
      ...itens,
      { tipo: CAKE_TYPES[0], tamanho: CAKE_SIZES[3], sabor: CAKE_FLAVORS[0], qtd: 1 },
    ]);
  };

  const handleUpdateItem = (index: number, changes: Partial<OrderItem>) => {
    const newItems = [...itens];
    newItems[index] = { ...newItems[index], ...changes };
    setItens(newItems);
  };

  const handleRemoveItem = (index: number) => {
    if (itens.length <= 1) return;
    const newItems = [...itens];
    newItems.splice(index, 1);
    setItens(newItems);
  };

  const handleSelectRecipeAsCake = (index: number, recipeId: string) => {
    const rec = recipes.find((r) => r.id === recipeId);
    if (!rec) return;

    const firstSize = rec.sizes && rec.sizes[0] ? rec.sizes[0].nome : 'Padrão';
    const firstPrice = rec.sizes && rec.sizes[0] ? rec.sizes[0].sell : 0;

    handleUpdateItem(index, {
      tipo: 'Bolo caseiro',
      sabor: rec.name,
      tamanho: firstSize,
      receitaId: rec.id,
      valorUnitario: firstPrice > 0 ? firstPrice : undefined,
    });

    // If order has no value set yet and recipe has sell price, pre-fill
    if (valor === 0 && firstPrice > 0) {
      setValor(firstPrice);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cliente.trim()) {
      setErrorMsg('Por favor informe o nome do cliente.');
      return;
    }
    if (!entrega) {
      setErrorMsg('Por favor informe a data de entrega.');
      return;
    }

    // Clean items
    const cleanedItems = itens.map((it) => ({
      tipo: it.tipo || CAKE_TYPES[0],
      tamanho: it.tamanho || CAKE_SIZES[0],
      sabor: it.sabor.trim() || 'Tradicional',
      qtd: Math.max(1, Number(it.qtd) || 1),
      receitaId: it.receitaId,
      valorUnitario: it.valorUnitario,
    }));

    const savedOrder: Order = {
      id: order ? order.id : uid(),
      cliente: cliente.trim(),
      telefone: telefone.trim() || undefined,
      entrega,
      hora: hora || undefined,
      valor: valor > 0 ? valor : undefined,
      sinal: sinal > 0 ? sinal : undefined,
      status,
      obs: obs.trim() || undefined,
      itens: cleanedItems,
      criadoEm: order?.criadoEm || Date.now(),
    };

    onSave(savedOrder);
    onClose();
  };

  const restante = Math.max(valor - sinal, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 rounded-2xl max-w-xl w-full p-5 sm:p-6 shadow-2xl border border-stone-200 dark:border-stone-800 my-8 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-stone-100 dark:border-stone-800">
          <div>
            <h3 className="text-lg font-bold text-stone-900 dark:text-stone-100 font-display">
              {isEditing ? 'Editar Encomenda' : 'Nova Encomenda de Bolo'}
            </h3>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              Preencha os dados do cliente e os bolos do pedido
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl hover:bg-stone-100 dark:hover:bg-stone-800 flex items-center justify-center text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto py-4 space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-800 dark:text-rose-300 text-xs">
              {errorMsg}
            </div>
          )}

          {/* Cliente e Telefone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-stone-400" />
                <span>Cliente *</span>
              </label>
              <input
                type="text"
                value={cliente}
                onChange={(e) => setCliente(e.target.value)}
                placeholder="Nome do cliente"
                className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500 rounded-xl text-sm font-medium focus:bg-white dark:focus:bg-stone-800 focus:border-amber-500 transition-colors min-h-[42px]"
                autoFocus={!isEditing}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-stone-400" />
                <span>Telefone / WhatsApp</span>
              </label>
              <input
                type="tel"
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
                placeholder="(00) 00000-0000"
                className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500 rounded-xl text-sm font-medium focus:bg-white dark:focus:bg-stone-800 focus:border-amber-500 transition-colors min-h-[42px]"
              />
            </div>
          </div>

          {/* Bolos da Encomenda (Multiple Items) */}
          <div className="space-y-3 pt-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-stone-800 dark:text-stone-200 uppercase tracking-wider flex items-center gap-1.5">
                <Cake className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span>Bolos da Encomenda ({itens.length})</span>
              </label>
            </div>

            <div className="space-y-3">
              {itens.map((it, idx) => {
                const isCustomFlavor = !CAKE_FLAVORS.includes(it.sabor) && it.sabor !== '';

                return (
                  <div
                    key={idx}
                    className="p-3.5 bg-stone-50 dark:bg-stone-800/50 border border-stone-200/90 dark:border-stone-700/80 rounded-2xl space-y-2.5 relative"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-stone-700 dark:text-stone-300">
                        Bolo #{idx + 1}
                      </span>
                      {itens.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          className="text-stone-400 hover:text-rose-600 text-xs flex items-center gap-1 p-1 min-h-[32px]"
                          title="Remover bolo"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Remover</span>
                        </button>
                      )}
                    </div>

                    {/* Pre-fill from Registered Recipes option */}
                    {recipes.length > 0 && (
                      <div className="pb-1">
                        <select
                          value={it.receitaId || ''}
                          onChange={(e) => {
                            if (e.target.value) {
                              handleSelectRecipeAsCake(idx, e.target.value);
                            }
                          }}
                          className="w-full px-2.5 py-1.5 bg-white dark:bg-stone-800 border border-dashed border-amber-300 dark:border-amber-700/80 rounded-lg text-xs font-medium text-amber-900 dark:text-amber-300 focus:border-amber-500"
                        >
                          <option value="">⚡ Usar receita cadastrada no app (opcional)...</option>
                          {recipes.map((r) => (
                            <option key={r.id} value={r.id}>
                              Receita: {r.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-[11px] font-semibold text-stone-600 dark:text-stone-400 mb-0.5">
                          Tipo de Bolo
                        </label>
                        <select
                          value={it.tipo}
                          onChange={(e) => handleUpdateItem(idx, { tipo: e.target.value })}
                          className="w-full px-2.5 py-2 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 rounded-xl text-xs sm:text-sm font-medium focus:border-amber-500 min-h-[40px]"
                        >
                          {CAKE_TYPES.map((t) => (
                            <option key={t} value={t}>
                              {t}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-stone-600 dark:text-stone-400 mb-0.5">
                          Tamanho
                        </label>
                        <select
                          value={it.tamanho}
                          onChange={(e) => handleUpdateItem(idx, { tamanho: e.target.value })}
                          className="w-full px-2.5 py-2 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 rounded-xl text-xs sm:text-sm font-medium focus:border-amber-500 min-h-[40px]"
                        >
                          {CAKE_SIZES.map((sz) => (
                            <option key={sz} value={sz}>
                              {sz}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      <div className="sm:col-span-2">
                        <label className="block text-[11px] font-semibold text-stone-600 dark:text-stone-400 mb-0.5">
                          Sabor / Recheio
                        </label>
                        <div className="space-y-1.5">
                          <select
                            value={isCustomFlavor ? '__outro' : it.sabor}
                            onChange={(e) => {
                              if (e.target.value === '__outro') {
                                handleUpdateItem(idx, { sabor: 'Outro sabor' });
                              } else {
                                handleUpdateItem(idx, { sabor: e.target.value });
                              }
                            }}
                            className="w-full px-2.5 py-2 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 rounded-xl text-xs sm:text-sm font-medium focus:border-amber-500 min-h-[40px]"
                          >
                            <option value="">Selecione o sabor...</option>
                            {CAKE_FLAVORS.map((f) => (
                              <option key={f} value={f}>
                                {f}
                              </option>
                            ))}
                            <option value="__outro">Outro sabor (digitar livre)</option>
                          </select>

                          {isCustomFlavor && (
                            <input
                              type="text"
                              value={it.sabor === 'Outro sabor' ? '' : it.sabor}
                              onChange={(e) => handleUpdateItem(idx, { sabor: e.target.value })}
                              placeholder="Digite o sabor ou combinação desejada..."
                              className="w-full px-2.5 py-1.5 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500 rounded-lg text-xs font-medium focus:border-amber-500 min-h-[38px]"
                              autoFocus
                            />
                          )}
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-stone-600 dark:text-stone-400 mb-0.5">
                          Quantidade
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={it.qtd}
                          onChange={(e) =>
                            handleUpdateItem(idx, { qtd: Math.max(1, parseInt(e.target.value, 10) || 1) })
                          }
                          className="w-full px-2.5 py-2 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 rounded-xl text-xs sm:text-sm font-bold text-center tabular-nums focus:border-amber-500 min-h-[40px]"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              onClick={handleAddItem}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-amber-900 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/40 border border-amber-200 dark:border-amber-800 rounded-xl transition-colors min-h-[40px]"
            >
              <Plus className="w-4 h-4" />
              <span>+ Adicionar outro bolo na encomenda</span>
            </button>
          </div>

          {/* Data e Horário de Entrega */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-stone-100 dark:border-stone-800">
            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-stone-400" />
                <span>Data de Entrega *</span>
              </label>
              <input
                type="date"
                value={entrega}
                onChange={(e) => setEntrega(e.target.value)}
                className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 rounded-xl text-sm font-semibold tabular-nums focus:bg-white dark:focus:bg-stone-800 focus:border-amber-500 transition-colors min-h-[42px]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-stone-400" />
                <span>Horário de Entrega</span>
              </label>
              <input
                type="time"
                value={hora}
                onChange={(e) => setHora(e.target.value)}
                className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 rounded-xl text-sm font-semibold tabular-nums focus:bg-white dark:focus:bg-stone-800 focus:border-amber-500 transition-colors min-h-[42px]"
              />
            </div>
          </div>

          {/* Valores: Valor Total e Sinal Pago */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1 flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-stone-400" />
                <span>Valor Total da Encomenda (R$)</span>
              </label>
              <NumericInput
                value={valor}
                onChange={(val) => setValor(val)}
                placeholder="0,00"
                prefix="R$"
                min={0}
                className="px-3 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 rounded-xl text-sm font-bold tabular-nums text-right focus:bg-white dark:focus:bg-stone-800 min-h-[42px]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                Sinal Pago pelo Cliente (R$)
              </label>
              <NumericInput
                value={sinal}
                onChange={(val) => setSinal(val)}
                placeholder="0,00"
                prefix="R$"
                min={0}
                className="px-3 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 rounded-xl text-sm font-bold tabular-nums text-right focus:bg-white dark:focus:bg-stone-800 min-h-[42px]"
              />
              {sinal > 0 && valor > 0 && (
                <span className="text-[11px] text-stone-500 dark:text-stone-400 block mt-1">
                  Restante a pagar na entrega: <strong>{restante > 0 ? `R$ ${restante.toFixed(2).replace('.', ',')}` : 'Quitado'}</strong>
                </span>
              )}
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
              Status da Encomenda
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['pendente', 'pronto', 'entregue'] as OrderStatus[]).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatus(st)}
                  className={`py-2 px-3 text-xs font-bold rounded-xl border transition-all capitalize min-h-[40px] ${
                    status === st
                      ? st === 'entregue'
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : st === 'pronto'
                        ? 'bg-sky-600 text-white border-sky-600'
                        : 'bg-amber-600 text-white border-amber-600'
                      : 'bg-stone-50 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-700'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {/* Observações */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-stone-400" />
              <span>Observações (tema, frase, alergias, endereço...)</span>
            </label>
            <textarea
              rows={3}
              value={obs}
              onChange={(e) => setObs(e.target.value)}
              placeholder="Ex.: Escrever 'Parabéns Maria', topo com laço rosa, cliente vem retirar às 16h..."
              className="w-full p-2.5 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500 focus:bg-white dark:focus:bg-stone-800 focus:border-amber-500 transition-colors text-xs sm:text-sm rounded-xl"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-stone-100 dark:border-stone-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-xl transition-colors min-h-[42px]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-500 rounded-xl shadow-xs transition-all min-h-[42px]"
            >
              {isEditing ? 'Salvar Alterações' : 'Criar Encomenda'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
