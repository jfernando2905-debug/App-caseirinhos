import React, { useState } from 'react';
import { ChefHat, Plus, Sparkles, ShoppingBag, Calendar, Sun, Moon, Cloud, CloudCheck, LogIn, LogOut, User as UserIcon } from 'lucide-react';
import { AppData } from '../types';
import { useAuth } from '../context/AuthContext';

interface HeaderProps {
  data: AppData;
  onNewRecipe: () => void;
  onNewOrder: () => void;
  onOpenPaste: () => void;
  onOpenAuth: () => void;
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
  onOpenAuth,
  activeTab,
  onNavigate,
  theme,
  onToggleTheme,
}) => {
  const { user, signOut } = useAuth();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
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
          {/* Cloud Auth / User Profile */}
          <div className="relative">
            {user ? (
              <button
                onClick={() => setUserMenuOpen((prev) => !prev)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-stone-800 hover:bg-stone-700 border border-stone-700 rounded-xl transition-all active:scale-[0.98] text-xs font-medium text-stone-200"
                title={`Conectado como ${user.email} (Dados salvos no Firebase)`}
              >
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'Usuário'}
                    className="w-5 h-5 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-amber-600 text-white font-bold flex items-center justify-center text-[10px]">
                    {(user.displayName || user.email || 'U')[0].toUpperCase()}
                  </div>
                )}
                <span className="hidden sm:inline max-w-[100px] truncate">
                  {user.displayName?.split(' ')[0] || user.email?.split('@')[0]}
                </span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title="Sincronizado na Nuvem" />
              </button>
            ) : (
              <button
                onClick={onOpenAuth}
                className="flex items-center gap-1.5 px-3 py-2 bg-stone-800 hover:bg-stone-700 border border-amber-500/40 hover:border-amber-500 rounded-xl transition-all active:scale-[0.98] text-xs font-semibold text-amber-300 min-h-[40px]"
                title="Entrar ou cadastrar para salvar no banco de dados na nuvem"
              >
                <Cloud className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="hidden sm:inline">Salvar na Nuvem</span>
                <span className="sm:hidden">Nuvem</span>
              </button>
            )}

            {/* Dropdown menu when logged in */}
            {user && userMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setUserMenuOpen(false)}
                />
                <div className="absolute right-0 mt-2 w-64 bg-stone-900 border border-stone-800 rounded-2xl shadow-xl z-50 p-3 space-y-3">
                  <div className="border-b border-stone-800 pb-2">
                    <p className="text-xs font-semibold text-white truncate">
                      {user.displayName || 'Confeitaria'}
                    </p>
                    <p className="text-[11px] text-stone-400 truncate mt-0.5">
                      {user.email}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 px-2.5 py-2 bg-stone-800/80 rounded-xl text-xs text-emerald-400">
                    <CloudCheck className="w-4 h-4 shrink-0 text-emerald-400" />
                    <span>Banco de Dados Firestore Conectado</span>
                  </div>

                  <p className="text-[11px] text-stone-400 px-1 leading-relaxed">
                    Suas receitas, preços e encomendas são salvos automaticamente na nuvem para você acessar de qualquer celular ou computador.
                  </p>

                  <button
                    onClick={() => {
                      setUserMenuOpen(false);
                      signOut();
                    }}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 rounded-xl transition-colors border border-rose-900/30"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sair da conta</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
