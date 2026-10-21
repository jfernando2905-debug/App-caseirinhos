import React from 'react';
import { ChefHat, Plus, Sparkles, ShoppingBag, Calendar, Sun, Moon } from 'lucide-react';
import { AppData } from '../types';

interface HeaderProps {
  data: AppData;
  onNewRecipe: () => void;
  onNewOrder: () => void;
  onOpenPaste: () => void;
  activeTab: 'orders' | 'recs' | 'ings' | 'scale' | 'cfg';
  onNavigate: (tab: 'orders' | 'recs' | 'ings' | 'scale' | 'cfg') => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  data,
  onNewRecipe,
  onNewOrder,
  onOpenPaste,
  activeTab,
  onNavigate,
  theme,
  onToggleTheme,
}) => {
  const missingPricesCount = data.ings.filter((i) => i.price <= 0).length;
  const openOrdersCount = (data.orders || []).filter((o) => o.status !== 'entregue').length;

  return (
    <header className="sticky top-0 z-30 bg-stone-900 text-stone-100 border-b border-stone-800 shadow-md">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Zone 1: Wordmark */}
        <div 
          onClick={() => onNavigate('orders')}
          className="flex items-center gap-2.5 cursor-pointer select-none group"
        >
          <div className="w-9 h-9 rounded-xl bg-amber-600 flex items-center justify-center text-white shadow-sm transition-transform group-hover:scale-105 shrink-0">
            <ChefHat className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-white font-display leading-tight whitespace-nowrap">
              Custo de Receitas
            </h1>
            <p className="text-[11px] text-stone-400 font-normal leading-none hidden sm:block">
              Encomendas & Confeitaria Caseira
            </p>
          </div>
        </div>

        {/* Zone 2: Navigation Links (Desktop) */}
        <nav className="hidden md:flex items-center gap-1 text-sm font-medium">
          <button
            onClick={() => onNavigate('orders')}
            className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'orders'
                ? 'bg-stone-800 text-amber-400 font-semibold'
                : 'text-stone-300 hover:text-white hover:bg-stone-800/60'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Encomendas ({openOrdersCount})</span>
          </button>
          <button
            onClick={() => onNavigate('recs')}
            className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
              activeTab === 'recs'
                ? 'bg-stone-800 text-amber-400 font-semibold'
                : 'text-stone-300 hover:text-white hover:bg-stone-800/60'
            }`}
          >
            Receitas ({data.recs.length})
          </button>
          <button
            onClick={() => onNavigate('ings')}
            className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'ings'
                ? 'bg-stone-800 text-amber-400 font-semibold'
                : 'text-stone-300 hover:text-white hover:bg-stone-800/60'
            }`}
          >
            Ingredientes ({data.ings.length})
            {missingPricesCount > 0 && (
              <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" title={`${missingPricesCount} sem preço`} />
            )}
          </button>
          <button
            onClick={() => onNavigate('scale')}
            className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'scale'
                ? 'bg-stone-800 text-amber-400 font-semibold'
                : 'text-stone-300 hover:text-white hover:bg-stone-800/60'
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            Escalonar
          </button>
          <button
            onClick={() => onNavigate('cfg')}
            className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
              activeTab === 'cfg'
                ? 'bg-stone-800 text-amber-400 font-semibold'
                : 'text-stone-300 hover:text-white hover:bg-stone-800/60'
            }`}
          >
            Ajustes
          </button>
        </nav>

        {/* Zone 3: Quick Action CTAs */}
        {/* Zone 3: Quick Action CTAs & Theme Switcher */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Theme Toggle Button */}
          <button
            onClick={onToggleTheme}
            className="w-10 h-10 rounded-xl bg-stone-800 hover:bg-stone-700 border border-stone-700/80 flex items-center justify-center text-stone-300 hover:text-white transition-all active:scale-[0.96] shadow-xs"
            title={theme === 'dark' ? 'Mudar para Modo Claro' : 'Mudar para Modo Escuro'}
            aria-label={theme === 'dark' ? 'Mudar para Modo Claro' : 'Mudar para Modo Escuro'}
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-stone-300" />
            )}
          </button>

          {activeTab === 'orders' ? (
            <button
              onClick={onNewOrder}
              className="flex items-center gap-1 px-3 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-500 rounded-xl shadow-xs transition-all active:scale-[0.98] whitespace-nowrap min-h-[40px]"
            >
              <Plus className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">Nova Encomenda</span>
              <span className="sm:hidden">Encomenda</span>
            </button>
          ) : (
            <>
              <button
                onClick={onOpenPaste}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-amber-300 bg-stone-800 hover:bg-stone-700 border border-stone-700 rounded-xl transition-all active:scale-[0.98] whitespace-nowrap min-h-[40px]"
                title="Importar receita colando o texto"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="hidden sm:inline">Colar Receita</span>
                <span className="sm:hidden">Colar</span>
              </button>

              <button
                onClick={onNewRecipe}
                className="flex items-center gap-1 px-3 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-500 rounded-xl shadow-xs transition-all active:scale-[0.98] whitespace-nowrap min-h-[40px]"
              >
                <Plus className="w-4 h-4 shrink-0" />
                <span className="hidden sm:inline">Nova Receita</span>
                <span className="sm:hidden">Receita</span>
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
