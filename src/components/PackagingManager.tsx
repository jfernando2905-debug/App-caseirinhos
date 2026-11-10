import React, { useState, useMemo } from 'react';
import {
  Boxes,
  Plus,
  Search,
  Filter,
  PackageCheck,
  AlertTriangle,
  History,
  Pencil,
  Trash2,
  ArrowUpRight,
  ArrowDownRight,
  RotateCcw,
  DollarSign,
  Package,
  Layers,
  X,
  Save,
  CheckCircle2,
  Tag,
  Truck,
  FileText,
} from 'lucide-react';
import { PackagingItem, PackagingMovement, PackagingCategory, Recipe } from '../types';
import { formatCurrency, formatNumber } from '../utils/calculations';
import { uid } from '../utils/storage';
import { NumericInput } from './NumericInput';

interface PackagingManagerProps {
  packagings: PackagingItem[];
  movements: PackagingMovement[];
  recipes?: Recipe[];
  onSavePackaging: (item: PackagingItem) => void;
  onDeletePackaging: (id: string) => void;
  onAddMovement: (movement: PackagingMovement) => void;
  onToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const PACKAGING_CATEGORIES: PackagingCategory[] = [
  'Caixas para Bolos',
  'Caixas para Doces',
  'Forminhas',
  'Bases e Suportes',
  'Sacolas',
  'Potes e Embalagens Plásticas',
  'Papel Manteiga',
  'Etiquetas e Adesivos',
  'Outros',
];

export const PackagingManager: React.FC<PackagingManagerProps> = ({
  packagings,
  movements,
  recipes = [],
  onSavePackaging,
  onDeletePackaging,
  onAddMovement,
  onToast,
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [stockStatusFilter, setStockStatusFilter] = useState<'all' | 'low' | 'empty'>('all');

  // Modal states
  const [editingItem, setEditingItem] = useState<PackagingItem | null>(null);
  const [isFormModalOpen, setIsFormModalOpen] = useState<boolean>(false);
  const [movingItem, setMovingItem] = useState<PackagingItem | null>(null);
  const [movingType, setMovingType] = useState<'entrada' | 'saida' | 'ajuste'>('entrada');
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState<boolean>(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Form State
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState<string>('Caixas para Bolos');
  const [formDimension, setFormDimension] = useState('');
  const [formUnit, setFormUnit] = useState('un');
  const [formStock, setFormStock] = useState(0);
  const [formMinStock, setFormMinStock] = useState(5);
  const [formPrice, setFormPrice] = useState<number | undefined>(undefined);
  const [formSize, setFormSize] = useState<number | undefined>(1);
  const [formSupplier, setFormSupplier] = useState('');
  const [formNotes, setFormNotes] = useState('');

  // Movement Form State
  const [movementQty, setMovementQty] = useState<number>(1);
  const [movementOrigin, setMovementOrigin] = useState<string>('Compra');
  const [movementNote, setMovementNote] = useState<string>('');

  // History Filter
  const [historySearch, setHistorySearch] = useState('');
  const [historyTypeFilter, setHistoryTypeFilter] = useState('all');

  // KPI Calculations
  const totalItems = packagings.length;
  const lowStockItems = useMemo(
    () => packagings.filter((p) => p.stock <= p.minStock && p.stock > 0),
    [packagings]
  );
  const emptyStockItems = useMemo(
    () => packagings.filter((p) => p.stock === 0),
    [packagings]
  );
  const totalStockValue = useMemo(() => {
    return packagings.reduce((sum, p) => {
      const uPrice = (p.price || 0) / (p.size && p.size > 0 ? p.size : 1);
      return sum + p.stock * uPrice;
    }, 0);
  }, [packagings]);

  // Filtered Packagings List
  const filteredPackagings = useMemo(() => {
    return packagings.filter((p) => {
      const matchSearch =
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.dimension && p.dimension.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (p.supplier && p.supplier.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (p.category && p.category.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchCat = selectedCategory === 'all' || p.category === selectedCategory;

      let matchStatus = true;
      if (stockStatusFilter === 'low') matchStatus = p.stock <= p.minStock && p.stock > 0;
      if (stockStatusFilter === 'empty') matchStatus = p.stock === 0;

      return matchSearch && matchCat && matchStatus;
    });
  }, [packagings, searchTerm, selectedCategory, stockStatusFilter]);

  // Open Create Modal
  const handleOpenCreate = () => {
    setEditingItem(null);
    setFormName('');
    setFormCategory('Caixas para Bolos');
    setFormDimension('');
    setFormUnit('un');
    setFormStock(10);
    setFormMinStock(5);
    setFormPrice(undefined);
    setFormSize(1);
    setFormSupplier('');
    setFormNotes('');
    setIsFormModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (item: PackagingItem) => {
    setEditingItem(item);
    setFormName(item.name);
    setFormCategory(item.category || 'Caixas para Bolos');
    setFormDimension(item.dimension || '');
    setFormUnit(item.unit || 'un');
    setFormStock(item.stock || 0);
    setFormMinStock(item.minStock || 0);
    setFormPrice(item.price);
    setFormSize(item.size || 1);
    setFormSupplier(item.supplier || '');
    setFormNotes(item.notes || '');
    setIsFormModalOpen(true);
  };

  // Save Packaging
  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      if (onToast) onToast('Informe o nome da embalagem.', 'error');
      return;
    }

    const isNew = !editingItem;
    const now = Date.now();
    const newItem: PackagingItem = {
      id: editingItem ? editingItem.id : `pack_${uid()}`,
      name: formName.trim(),
      category: formCategory,
      dimension: formDimension.trim(),
      unit: formUnit.trim() || 'un',
      stock: Math.max(0, formStock),
      minStock: Math.max(0, formMinStock),
      price: formPrice !== undefined && formPrice >= 0 ? formPrice : undefined,
      size: formSize && formSize > 0 ? formSize : 1,
      supplier: formSupplier.trim(),
      notes: formNotes.trim(),
      updatedAt: now,
    };

    onSavePackaging(newItem);

    // If initial stock was entered on creation, log initial movement
    if (isNew && formStock > 0) {
      onAddMovement({
        id: uid(),
        packagingId: newItem.id,
        packagingName: newItem.name,
        type: 'entrada',
        origin: 'Estoque Inicial',
        qty: formStock,
        unit: newItem.unit,
        date: now,
        note: 'Estoque inicial cadastrado',
      });
    }

    setIsFormModalOpen(false);
    if (onToast) {
      onToast(
        isNew ? `Embalagem "${newItem.name}" cadastrada!` : `Embalagem "${newItem.name}" atualizada!`,
        'success'
      );
    }
  };

  // Delete Packaging
  const handleConfirmDelete = (id: string) => {
    const item = packagings.find((p) => p.id === id);
    onDeletePackaging(id);
    setDeletingId(null);
    if (onToast) onToast(`Embalagem "${item?.name || ''}" removida com sucesso.`, 'info');
  };

  // Open Quick Movement Modal
  const handleOpenMovement = (item: PackagingItem, type: 'entrada' | 'saida' | 'ajuste') => {
    setMovingItem(item);
    setMovingType(type);
    setMovementQty(1);
    setMovementOrigin(type === 'entrada' ? 'Compra' : type === 'saida' ? 'Uso Manual' : 'Ajuste de Inventário');
    setMovementNote('');
  };

  // Confirm Movement
  const handleConfirmMovement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!movingItem || movementQty <= 0) return;

    let updatedStock = movingItem.stock;
    let actualQty = movementQty;

    if (movingType === 'entrada') {
      updatedStock += movementQty;
    } else if (movingType === 'saida') {
      updatedStock = Math.max(0, movingItem.stock - movementQty);
      actualQty = -movementQty;
    } else if (movingType === 'ajuste') {
      const diff = movementQty - movingItem.stock;
      updatedStock = Math.max(0, movementQty);
      actualQty = diff;
    }

    // Save updated stock
    onSavePackaging({
      ...movingItem,
      stock: updatedStock,
      updatedAt: Date.now(),
    });

    // Record movement log
    const movementLog: PackagingMovement = {
      id: uid(),
      packagingId: movingItem.id,
      packagingName: movingItem.name,
      type: movingType === 'ajuste' ? 'ajuste' : movingType,
      origin: movementOrigin,
      qty: actualQty,
      unit: movingItem.unit,
      date: Date.now(),
      note: movementNote.trim() || undefined,
    };

    onAddMovement(movementLog);
    setMovingItem(null);

    if (onToast) {
      const actionText =
        movingType === 'entrada'
          ? `+${movementQty} ${movingItem.unit} adicionado`
          : movingType === 'saida'
          ? `-${movementQty} ${movingItem.unit} retirado`
          : `Estoque ajustado para ${updatedStock} ${movingItem.unit}`;
      onToast(`Movimentação salva: ${actionText} em "${movingItem.name}".`, 'success');
    }
  };

  // Filtered Movements for History Modal
  const filteredMovements = useMemo(() => {
    return movements
      .filter((m) => {
        const matchSearch =
          m.packagingName.toLowerCase().includes(historySearch.toLowerCase()) ||
          (m.note && m.note.toLowerCase().includes(historySearch.toLowerCase())) ||
          (m.origin && m.origin.toLowerCase().includes(historySearch.toLowerCase()));

        const matchType =
          historyTypeFilter === 'all' ||
          (historyTypeFilter === 'entrada' && m.type === 'entrada') ||
          (historyTypeFilter === 'saida' && m.type === 'saida') ||
          (historyTypeFilter === 'ajuste' && (m.type === 'ajuste' || m.type === 'estorno'));

        return matchSearch && matchType;
      })
      .sort((a, b) => b.date - a.date);
  }, [movements, historySearch, historyTypeFilter]);

  return (
    <div className="space-y-6">
      {/* Top Banner & Header Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-stone-900 dark:text-stone-100 font-display flex items-center gap-2">
            <Boxes className="w-6 h-6 text-amber-600 dark:text-amber-400 shrink-0" />
            <span>Estoque de Embalagens</span>
          </h2>
          <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-400 mt-0.5">
            Gerencie caixas, forminhas, sacolas, potes e insumos de apresentação da sua confeitaria.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 no-print">
          <button
            type="button"
            onClick={() => setIsHistoryModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-stone-700 dark:text-stone-200 bg-white dark:bg-stone-800 hover:bg-stone-50 dark:hover:bg-stone-700 border border-stone-200 dark:border-stone-700 rounded-xl transition-colors shadow-xs min-h-[40px]"
          >
            <History className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <span>Histórico de Movimentações</span>
          </button>

          <button
            type="button"
            onClick={handleOpenCreate}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-xs transition-colors min-h-[40px]"
          >
            <Plus className="w-4 h-4" />
            <span>Nova Embalagem</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-4">
        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-3.5 sm:p-4 shadow-xs">
          <span className="text-[11px] sm:text-xs text-stone-500 dark:text-stone-400 block mb-0.5">
            Embalagens Cadastradas
          </span>
          <strong className="text-lg sm:text-2xl font-bold text-stone-900 dark:text-stone-100 tabular-nums font-display block">
            {totalItems} itens
          </strong>
          <span className="text-[10px] sm:text-[11px] text-stone-500 dark:text-stone-400 block mt-0.5">
            Em {PACKAGING_CATEGORIES.length} categorias
          </span>
        </div>

        <div
          onClick={() => setStockStatusFilter(stockStatusFilter === 'low' ? 'all' : 'low')}
          className={`bg-white dark:bg-stone-900 border rounded-2xl p-3.5 sm:p-4 shadow-xs cursor-pointer transition-all ${
            lowStockItems.length > 0
              ? 'border-amber-300 dark:border-amber-800 bg-amber-50/30 dark:bg-amber-950/20'
              : 'border-stone-200 dark:border-stone-800'
          }`}
        >
          <span className="text-[11px] sm:text-xs text-stone-500 dark:text-stone-400 block mb-0.5 flex items-center justify-between">
            <span>Estoque Baixo</span>
            {lowStockItems.length > 0 && (
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            )}
          </span>
          <strong className="text-lg sm:text-2xl font-bold text-amber-700 dark:text-amber-400 tabular-nums font-display block">
            {lowStockItems.length} itens
          </strong>
          <span className="text-[10px] sm:text-[11px] text-amber-800 dark:text-amber-300 block mt-0.5">
            Abaixo do estoque mínimo
          </span>
        </div>

        <div
          onClick={() => setStockStatusFilter(stockStatusFilter === 'empty' ? 'all' : 'empty')}
          className={`bg-white dark:bg-stone-900 border rounded-2xl p-3.5 sm:p-4 shadow-xs cursor-pointer transition-all ${
            emptyStockItems.length > 0
              ? 'border-rose-300 dark:border-rose-900 bg-rose-50/30 dark:bg-rose-950/20'
              : 'border-stone-200 dark:border-stone-800'
          }`}
        >
          <span className="text-[11px] sm:text-xs text-stone-500 dark:text-stone-400 block mb-0.5 flex items-center justify-between">
            <span>Sem Estoque</span>
            {emptyStockItems.length > 0 && (
              <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
            )}
          </span>
          <strong className="text-lg sm:text-2xl font-bold text-rose-700 dark:text-rose-400 tabular-nums font-display block">
            {emptyStockItems.length} itens
          </strong>
          <span className="text-[10px] sm:text-[11px] text-rose-800 dark:text-rose-300 block mt-0.5">
            Necessita compra urgente
          </span>
        </div>

        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-3.5 sm:p-4 shadow-xs">
          <span className="text-[11px] sm:text-xs text-stone-500 dark:text-stone-400 block mb-0.5">
            Valor Total em Estoque
          </span>
          <strong className="text-lg sm:text-2xl font-bold text-emerald-700 dark:text-emerald-400 tabular-nums font-display block">
            {formatCurrency(totalStockValue)}
          </strong>
          <span className="text-[10px] sm:text-[11px] text-stone-500 dark:text-stone-400 block mt-0.5">
            Patrimônio em embalagens
          </span>
        </div>
      </div>

      {/* Search & Filter Strip */}
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-4 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nome, dimensão, fornecedor ou categoria..."
              className="w-full pl-9 pr-4 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-xs sm:text-sm font-medium text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:bg-white dark:focus:bg-stone-800 focus:border-amber-500"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Status Filter Tabs */}
          <div className="flex items-center gap-1 bg-stone-100 dark:bg-stone-800/80 p-1 rounded-xl text-xs border border-stone-200 dark:border-stone-700 shrink-0">
            <button
              type="button"
              onClick={() => setStockStatusFilter('all')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                stockStatusFilter === 'all'
                  ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-xs'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
              }`}
            >
              Todas ({packagings.length})
            </button>
            <button
              type="button"
              onClick={() => setStockStatusFilter('low')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                stockStatusFilter === 'low'
                  ? 'bg-amber-500 text-white shadow-xs font-bold'
                  : 'text-stone-600 dark:text-stone-400 hover:text-amber-700'
              }`}
            >
              Estoque Baixo ({lowStockItems.length})
            </button>
            <button
              type="button"
              onClick={() => setStockStatusFilter('empty')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                stockStatusFilter === 'empty'
                  ? 'bg-rose-600 text-white shadow-xs font-bold'
                  : 'text-stone-600 dark:text-stone-400 hover:text-rose-700'
              }`}
            >
              Sem Estoque ({emptyStockItems.length})
            </button>
          </div>
        </div>

        {/* Category Pills Slider */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 no-scrollbar text-xs">
          <button
            type="button"
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1.5 rounded-xl font-semibold transition-all whitespace-nowrap border shrink-0 ${
              selectedCategory === 'all'
                ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                : 'bg-stone-50 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border-stone-200 dark:border-stone-700 hover:bg-stone-100'
            }`}
          >
            Todas as Categorias
          </button>

          {PACKAGING_CATEGORIES.map((cat) => {
            const count = packagings.filter((p) => p.category === cat).length;
            if (count === 0 && selectedCategory !== cat) return null;

            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-xl font-semibold transition-all whitespace-nowrap border shrink-0 flex items-center gap-1.5 ${
                  selectedCategory === cat
                    ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                    : 'bg-stone-50 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border-stone-200 dark:border-stone-700 hover:bg-stone-100'
                }`}
              >
                <span>{cat}</span>
                <span className="opacity-70 text-[10px] bg-black/10 dark:bg-white/10 px-1.5 py-0.2 rounded-full">
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Packaging Grid List */}
      {filteredPackagings.length === 0 ? (
        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-10 text-center space-y-3">
          <Boxes className="w-12 h-12 text-stone-300 dark:text-stone-600 mx-auto" />
          <h3 className="text-base font-bold text-stone-800 dark:text-stone-200 font-display">
            Nenhuma embalagem encontrada
          </h3>
          <p className="text-xs text-stone-500 dark:text-stone-400 max-w-sm mx-auto">
            {searchTerm || selectedCategory !== 'all' || stockStatusFilter !== 'all'
              ? 'Nenhuma embalagem corresponde aos filtros aplicados. Tente limpar os filtros ou realizar uma nova busca.'
              : 'Você ainda não possui embalagens cadastradas. Clique no botão abaixo para adicionar a primeira.'}
          </p>
          <button
            type="button"
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Cadastrar Embalagem</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
          {filteredPackagings.map((item) => {
            const isLowStock = item.stock <= item.minStock && item.stock > 0;
            const isEmptyStock = item.stock === 0;
            const unitPrice = item.price && item.size && item.size > 0 ? item.price / item.size : item.price;

            return (
              <div
                key={item.id}
                className={`bg-white dark:bg-stone-900 border rounded-2xl p-4 shadow-xs flex flex-col justify-between transition-all ${
                  isEmptyStock
                    ? 'border-rose-300 dark:border-rose-900/80 bg-rose-50/20 dark:bg-rose-950/10'
                    : isLowStock
                    ? 'border-amber-300 dark:border-amber-800/80 bg-amber-50/20 dark:bg-amber-950/10'
                    : 'border-stone-200 dark:border-stone-800 hover:border-amber-300 dark:hover:border-amber-700'
                }`}
              >
                <div className="space-y-3">
                  {/* Top Category Badge & Actions */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700">
                        {item.category || 'Geral'}
                      </span>

                      {isEmptyStock ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-200 dark:border-rose-800 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3 text-rose-600" /> Sem Estoque
                        </span>
                      ) : isLowStock ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-200 dark:border-amber-800 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3 text-amber-600" /> Estoque Baixo
                        </span>
                      ) : (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                          Disponível
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(item)}
                        className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
                        title="Editar embalagem"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeletingId(item.id)}
                        className="p-1.5 rounded-lg text-stone-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                        title="Excluir embalagem"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Title & Specs */}
                  <div>
                    <h3 className="font-bold text-stone-900 dark:text-stone-100 text-base font-display">
                      {item.name}
                    </h3>
                    {item.dimension && (
                      <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 mt-0.5">
                        Dimensão / Tamanho: {item.dimension}
                      </p>
                    )}
                  </div>

                  {/* Stock Level Display */}
                  <div className="p-3 bg-stone-50 dark:bg-stone-800/60 border border-stone-200/80 dark:border-stone-800 rounded-xl space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-stone-500 dark:text-stone-400 font-medium">Estoque Atual:</span>
                      <strong
                        className={`text-sm font-bold tabular-nums font-display ${
                          isEmptyStock
                            ? 'text-rose-600 dark:text-rose-400'
                            : isLowStock
                            ? 'text-amber-600 dark:text-amber-400'
                            : 'text-emerald-700 dark:text-emerald-400'
                        }`}
                      >
                        {formatNumber(item.stock)} {item.unit}
                      </strong>
                    </div>

                    {/* Progress Bar relative to minStock */}
                    <div className="w-full bg-stone-200 dark:bg-stone-700 rounded-full h-1.5 overflow-hidden">
                      <div
                        className={`h-1.5 rounded-full transition-all duration-300 ${
                          isEmptyStock
                            ? 'bg-rose-500'
                            : isLowStock
                            ? 'bg-amber-500'
                            : 'bg-emerald-500'
                        }`}
                        style={{
                          width: `${Math.min(100, (item.stock / Math.max(1, item.minStock * 2)) * 100)}%`,
                        }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-stone-500 dark:text-stone-400 pt-0.5">
                      <span>Mínimo para alerta: <strong>{item.minStock} {item.unit}</strong></span>
                      {item.price !== undefined && item.price > 0 && (
                        <span>
                          Preço:{' '}
                          <strong className="text-stone-800 dark:text-stone-200">
                            {formatCurrency(item.price)}
                            {item.size && item.size > 1 ? ` (${item.size} un)` : ''}
                          </strong>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Additional info (supplier & notes) */}
                  {(item.supplier || item.notes) && (
                    <div className="text-[11px] text-stone-500 dark:text-stone-400 space-y-0.5">
                      {item.supplier && (
                        <div className="truncate">
                          <span>Fornecedor:</span> <strong className="text-stone-700 dark:text-stone-300">{item.supplier}</strong>
                        </div>
                      )}
                      {item.notes && (
                        <div className="line-clamp-2 italic text-stone-600 dark:text-stone-400">
                          "{item.notes}"
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Bottom Quick Action Strip */}
                <div className="flex items-center gap-1.5 pt-3 mt-3 border-t border-stone-100 dark:border-stone-800">
                  <button
                    type="button"
                    onClick={() => handleOpenMovement(item, 'entrada')}
                    className="flex-1 flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 text-xs font-bold border border-emerald-200 dark:border-emerald-800/80 transition-colors"
                    title="Adicionar entrada de compras no estoque"
                  >
                    <Plus className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Entrada</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOpenMovement(item, 'saida')}
                    className="flex-1 flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/50 text-amber-800 dark:text-amber-300 text-xs font-bold border border-amber-200 dark:border-amber-800/80 transition-colors"
                    title="Dar saída de embalagens por utilização"
                  >
                    <ArrowDownRight className="w-3.5 h-3.5 text-amber-600" />
                    <span>Saída</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOpenMovement(item, 'ajuste')}
                    className="p-1.5 rounded-lg border border-stone-200 dark:border-stone-700 text-stone-600 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
                    title="Ajuste manual de saldo"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
          onClick={() => setDeletingId(null)}
        >
          <div
            className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl max-w-sm w-full p-5 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-950 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-stone-900 dark:text-stone-100 font-display">
                  Excluir Embalagem?
                </h3>
                <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                  Esta ação é irreversível.
                </p>
              </div>
            </div>

            <p className="text-xs text-stone-600 dark:text-stone-300">
              Tem certeza que deseja excluir a embalagem{' '}
              <strong>"{packagings.find((p) => p.id === deletingId)?.name}"</strong> do seu cadastro?
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100 dark:border-stone-800">
              <button
                type="button"
                onClick={() => setDeletingId(null)}
                className="px-3.5 py-2 text-xs font-semibold text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => handleConfirmDelete(deletingId)}
                className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition-colors"
              >
                Confirmar Exclusão
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Form Modal (Create / Edit) */}
      {isFormModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto"
          onClick={() => setIsFormModalOpen(false)}
        >
          <div
            className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl max-w-lg w-full p-4 sm:p-6 shadow-2xl space-y-4 my-6 animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b border-stone-100 dark:border-stone-800 pb-3">
              <div className="flex items-center gap-2">
                <Boxes className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
                <h3 className="text-base sm:text-lg font-bold text-stone-900 dark:text-stone-100 font-display">
                  {editingItem ? 'Editar Embalagem' : 'Cadastrar Nova Embalagem'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsFormModalOpen(false)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-600 dark:hover:text-stone-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveForm} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Nome da Embalagem *
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Ex: Caixa para Bolo 20cm com visor"
                  className="w-full px-3.5 py-2.5 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-xs sm:text-sm font-semibold text-stone-900 dark:text-stone-100 focus:bg-white dark:focus:bg-stone-800 focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                    Categoria
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-xs sm:text-sm font-semibold text-stone-900 dark:text-stone-100 focus:bg-white dark:focus:bg-stone-800 focus:border-amber-500 min-h-[42px]"
                  >
                    {PACKAGING_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                    Dimensão / Tamanho (Opcional)
                  </label>
                  <input
                    type="text"
                    value={formDimension}
                    onChange={(e) => setFormDimension(e.target.value)}
                    placeholder="Ex: 22x22x15 cm ou 20cm"
                    className="w-full px-3.5 py-2.5 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-xs sm:text-sm font-semibold text-stone-900 dark:text-stone-100 focus:bg-white dark:focus:bg-stone-800 focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                    Unidade
                  </label>
                  <select
                    value={formUnit}
                    onChange={(e) => setFormUnit(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-xs font-semibold text-stone-900 dark:text-stone-100 focus:bg-white dark:focus:bg-stone-800 focus:border-amber-500 min-h-[42px]"
                  >
                    <option value="un">un (Unidade)</option>
                    <option value="pacote">pacote</option>
                    <option value="cento">cento</option>
                    <option value="rolo">rolo</option>
                    <option value="kg">kg</option>
                    <option value="m">m (Metros)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                    Estoque Atual
                  </label>
                  <NumericInput
                    value={formStock}
                    onChange={(val) => setFormStock(val)}
                    placeholder="0"
                    min={0}
                    maxDecimals={0}
                    className="w-full px-3.5 py-2.5 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-xs sm:text-sm font-bold text-stone-900 dark:text-stone-100 focus:bg-white dark:focus:bg-stone-800 focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                    Estoque Mínimo
                  </label>
                  <NumericInput
                    value={formMinStock}
                    onChange={(val) => setFormMinStock(val)}
                    placeholder="5"
                    min={0}
                    maxDecimals={0}
                    className="w-full px-3.5 py-2.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-300 rounded-xl text-xs sm:text-sm font-bold focus:bg-white dark:focus:bg-stone-800 focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                    Custo por Embalagem / Pacote (R$)
                  </label>
                  <NumericInput
                    value={formPrice}
                    onChange={(val) => setFormPrice(val)}
                    placeholder="0,00"
                    min={0}
                    maxDecimals={2}
                    prefix="R$"
                    className="w-full px-3.5 py-2.5 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-xs sm:text-sm font-bold text-stone-900 dark:text-stone-100 focus:bg-white dark:focus:bg-stone-800 focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                    Qtd por Pacote (Se aplicável)
                  </label>
                  <NumericInput
                    value={formSize}
                    onChange={(val) => setFormSize(val)}
                    placeholder="1"
                    min={1}
                    maxDecimals={0}
                    suffix="un/pacote"
                    className="w-full px-3.5 py-2.5 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-xs sm:text-sm font-semibold text-stone-900 dark:text-stone-100 focus:bg-white dark:focus:bg-stone-800 focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Fornecedor (Opcional)
                </label>
                <input
                  type="text"
                  value={formSupplier}
                  onChange={(e) => setFormSupplier(e.target.value)}
                  placeholder="Ex: Embalagens Silva ou Loja de Festas"
                  className="w-full px-3.5 py-2.5 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-xs sm:text-sm font-semibold text-stone-900 dark:text-stone-100 focus:bg-white dark:focus:bg-stone-800 focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Observações (Opcional)
                </label>
                <textarea
                  rows={2}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Ex: Caixa com tampa transparente para valorizar a decoração do bolo."
                  className="w-full px-3.5 py-2.5 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-xs font-normal text-stone-900 dark:text-stone-100 focus:bg-white dark:focus:bg-stone-800 focus:border-amber-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-100 dark:border-stone-800">
                <button
                  type="button"
                  onClick={() => setIsFormModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-xl transition-colors min-h-[40px]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-xs transition-colors min-h-[40px]"
                >
                  <Save className="w-4 h-4" />
                  <span>Salvar Embalagem</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Movement Modal (Entrada / Saída / Ajuste) */}
      {movingItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
          onClick={() => setMovingItem(null)}
        >
          <div
            className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b border-stone-100 dark:border-stone-800 pb-3">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                  Movimentação de Estoque
                </span>
                <h3 className="text-base sm:text-lg font-bold text-stone-900 dark:text-stone-100 font-display">
                  {movingItem.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setMovingItem(null)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-600 dark:hover:text-stone-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Movement Type Tabs */}
            <div className="flex items-center gap-1 bg-stone-100 dark:bg-stone-800 p-1 rounded-xl text-xs font-semibold border border-stone-200 dark:border-stone-700">
              <button
                type="button"
                onClick={() => {
                  setMovingType('entrada');
                  setMovementOrigin('Compra');
                }}
                className={`flex-1 py-2 px-2 rounded-lg transition-all flex items-center justify-center gap-1 ${
                  movingType === 'entrada'
                    ? 'bg-emerald-600 text-white font-bold shadow-xs'
                    : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
                }`}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Entrada</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setMovingType('saida');
                  setMovementOrigin('Uso Manual');
                }}
                className={`flex-1 py-2 px-2 rounded-lg transition-all flex items-center justify-center gap-1 ${
                  movingType === 'saida'
                    ? 'bg-amber-600 text-white font-bold shadow-xs'
                    : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
                }`}
              >
                <ArrowDownRight className="w-3.5 h-3.5" />
                <span>- Saída</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setMovingType('ajuste');
                  setMovementOrigin('Ajuste de Inventário');
                }}
                className={`flex-1 py-2 px-2 rounded-lg transition-all flex items-center justify-center gap-1 ${
                  movingType === 'ajuste'
                    ? 'bg-sky-600 text-white font-bold shadow-xs'
                    : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
                }`}
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Ajuste</span>
              </button>
            </div>

            <form onSubmit={handleConfirmMovement} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  {movingType === 'entrada'
                    ? 'Quantidade a Adicionar'
                    : movingType === 'saida'
                    ? 'Quantidade a Retirar'
                    : 'Novo Saldo Total'}
                </label>
                <NumericInput
                  value={movementQty}
                  onChange={(val) => setMovementQty(val)}
                  placeholder="1"
                  min={0.01}
                  maxDecimals={0}
                  suffix={movingItem.unit}
                  className="w-full px-3.5 py-2.5 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-base font-bold text-stone-900 dark:text-stone-100 focus:bg-white dark:focus:bg-stone-800 focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Origem / Motivo
                </label>
                <input
                  type="text"
                  value={movementOrigin}
                  onChange={(e) => setMovementOrigin(e.target.value)}
                  placeholder="Ex: Compra, Produção, Danificada, Inventário..."
                  className="w-full px-3.5 py-2.5 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-xs font-semibold text-stone-900 dark:text-stone-100 focus:bg-white dark:focus:bg-stone-800 focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Observações (Opcional)
                </label>
                <input
                  type="text"
                  value={movementNote}
                  onChange={(e) => setMovementNote(e.target.value)}
                  placeholder="Ex: Recebimento NF 1042..."
                  className="w-full px-3.5 py-2.5 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-xs font-normal text-stone-900 dark:text-stone-100 focus:bg-white dark:focus:bg-stone-800 focus:border-amber-500"
                />
              </div>

              {/* Preview calculation */}
              <div className="p-3 bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700 rounded-xl space-y-1 text-xs">
                <div className="flex justify-between text-stone-600 dark:text-stone-400">
                  <span>Estoque Atual:</span>
                  <strong>{movingItem.stock} {movingItem.unit}</strong>
                </div>
                <div className="flex justify-between font-bold text-stone-900 dark:text-stone-100 border-t border-stone-200/60 dark:border-stone-700 pt-1">
                  <span>Novo Estoque Resultante:</span>
                  <span className="text-amber-700 dark:text-amber-400 font-display text-sm">
                    {movingType === 'entrada'
                      ? movingItem.stock + movementQty
                      : movingType === 'saida'
                      ? Math.max(0, movingItem.stock - movementQty)
                      : movementQty}{' '}
                    {movingItem.unit}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100 dark:border-stone-800">
                <button
                  type="button"
                  onClick={() => setMovingItem(null)}
                  className="px-4 py-2 text-xs font-semibold text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white rounded-xl shadow-xs transition-colors ${
                    movingType === 'entrada'
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : movingType === 'saida'
                      ? 'bg-amber-600 hover:bg-amber-700'
                      : 'bg-sky-600 hover:bg-sky-700'
                  }`}
                >
                  <Save className="w-4 h-4" />
                  <span>Confirmar Movimentação</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Packaging Movement History Modal */}
      {isHistoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 rounded-2xl max-w-2xl w-full p-4 sm:p-6 shadow-2xl border border-stone-200 dark:border-stone-800 my-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100 dark:border-stone-800 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 flex items-center justify-center font-bold">
                  <History className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-stone-900 dark:text-stone-100 font-display">
                    Histórico de Movimentações de Embalagens
                  </h3>
                  <p className="text-xs text-stone-500 dark:text-stone-400">
                    Registro de todas as compras, saídas e ajustes de estoque.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsHistoryModalOpen(false)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-600 dark:hover:text-stone-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Filter controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  placeholder="Buscar por embalagem, observação ou origem..."
                  className="w-full pl-9 pr-3 py-1.5 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-xs text-stone-900 dark:text-stone-100 placeholder-stone-400"
                />
              </div>

              <div className="flex items-center gap-1 bg-stone-100 dark:bg-stone-800 p-0.5 rounded-lg border border-stone-200 dark:border-stone-700 text-xs shrink-0">
                <button
                  type="button"
                  onClick={() => setHistoryTypeFilter('all')}
                  className={`px-2 py-1 rounded font-semibold transition-colors ${
                    historyTypeFilter === 'all'
                      ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-xs'
                      : 'text-stone-600 dark:text-stone-400'
                  }`}
                >
                  Todas ({movements.length})
                </button>
                <button
                  type="button"
                  onClick={() => setHistoryTypeFilter('entrada')}
                  className={`px-2 py-1 rounded font-semibold transition-colors ${
                    historyTypeFilter === 'entrada'
                      ? 'bg-emerald-600 text-white shadow-xs font-bold'
                      : 'text-stone-600 dark:text-stone-400'
                  }`}
                >
                  Entradas
                </button>
                <button
                  type="button"
                  onClick={() => setHistoryTypeFilter('saida')}
                  className={`px-2 py-1 rounded font-semibold transition-colors ${
                    historyTypeFilter === 'saida'
                      ? 'bg-amber-600 text-white shadow-xs font-bold'
                      : 'text-stone-600 dark:text-stone-400'
                  }`}
                >
                  Saídas
                </button>
              </div>
            </div>

            {/* List Table */}
            <div className="border border-stone-200 dark:border-stone-800 rounded-xl overflow-hidden text-xs max-h-96 overflow-y-auto">
              <table className="w-full text-left">
                <thead className="bg-stone-50 dark:bg-stone-800 text-stone-600 dark:text-stone-300 sticky top-0 border-b border-stone-200 dark:border-stone-700">
                  <tr>
                    <th className="py-2.5 px-3 font-semibold">Data / Hora</th>
                    <th className="py-2.5 px-3 font-semibold">Embalagem</th>
                    <th className="py-2.5 px-3 font-semibold">Tipo / Origem</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Quantidade</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                  {filteredMovements.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-stone-500 dark:text-stone-400 italic">
                        Nenhuma movimentação de embalagem registrada.
                      </td>
                    </tr>
                  ) : (
                    filteredMovements.map((mov) => {
                      const isEntry = mov.type === 'entrada';
                      const isExit = mov.type === 'saida';

                      return (
                        <tr key={mov.id} className="hover:bg-stone-50 dark:hover:bg-stone-800/50">
                          <td className="py-2.5 px-3 text-stone-500 whitespace-nowrap">
                            {new Date(mov.date).toLocaleDateString('pt-BR')} às{' '}
                            {new Date(mov.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td className="py-2.5 px-3 font-bold text-stone-900 dark:text-stone-100">
                            <div>
                              <span>{mov.packagingName}</span>
                              {mov.note && (
                                <span className="block text-[10px] font-normal text-stone-500 dark:text-stone-400 truncate max-w-xs">
                                  {mov.note}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-1.5">
                              <span
                                className={`text-[10px] font-bold px-1.5 py-0.5 rounded capitalize ${
                                  isEntry
                                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                    : isExit
                                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                    : 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300'
                                }`}
                              >
                                {mov.type}
                              </span>
                              <span className="text-stone-500 text-[11px] truncate max-w-[120px]">
                                {mov.origin}
                              </span>
                            </div>
                          </td>
                          <td
                            className={`py-2.5 px-3 text-right font-bold tabular-nums whitespace-nowrap ${
                              isEntry
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : isExit
                                ? 'text-amber-700 dark:text-amber-400'
                                : 'text-sky-700 dark:text-sky-400'
                            }`}
                          >
                            {mov.qty > 0 ? `+${mov.qty}` : mov.qty} {mov.unit}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end pt-3">
              <button
                type="button"
                onClick={() => setIsHistoryModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-stone-700 dark:text-stone-300 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 rounded-xl transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
