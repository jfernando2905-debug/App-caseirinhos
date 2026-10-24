import React, { useState } from 'react';
import {
  ChefHat,
  Plus,
  Sparkles,
  ShoppingBag,
  Calendar,
  Sun,
  Moon,
  Cloud,
  CloudCheck,
  LogIn,
  LogOut,
  User as UserIcon,
  Menu,
  X,
  Cake,
  Egg,
  Settings,
} from 'lucide-react';
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const missingPricesCount = (data.ings || []).filter((i) => i.price <= 0).length;
  const openOrdersCount = (data.orders || []).filter((o) => o.status !== 'entregue').length;

  return (
    <header className="sticky top-0 z-30 bg-stone-900 text-stone-100 border-b border-stone-800 shadow-md">
      <div className="max-w-6xl mx-auto px-3 sm:px-6 h-16 flex items-center justify-between gap-2 sm:gap-4">
        {/* Zone 1: Wordmark */}
        <div 
          onClick={() => onNavigate('orders')}
          className="flex items-center gap-2 cursor-pointer select-none group min-w-0"
        >
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-amber-600 flex items-center justify-center text-white shadow-sm transition-transform group-hover:scale-105 shrink-0">
            <ChefHat className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-base sm:text-lg font-bold tracking-tight text-white font-display leading-tight truncate">
              Caseirinhos Fer&Dre
            </h1>
            <p className="text-[10px] sm:text-[11px] text-stone-400 font-normal leading-none hidden sm:block">
              Encomendas & Confeitaria Caseira
            </p>
          </div>
        </div>

        {/* Zone 2: Navigation Links (Desktop only) */}
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

        {/* Zone 3: Mobile Action Row (Visible ONLY: Dark/Light Mode, + Encomenda shortcut, and Hamburger Menu) */}
        <div className="flex md:hidden items-center gap-1.5 shrink-0">
          {/* Dark/Light mode toggle */}
          <button
            onClick={onToggleTheme}
            className="w-9 h-9 rounded-xl bg-stone-800 hover:bg-stone-700 border border-stone-700/80 flex items-center justify-center text-stone-300 hover:text-white transition-all active:scale-[0.96] shadow-xs"
            title={theme === 'dark' ? 'Mudar para Modo Claro' : 'Mudar para Modo Escuro'}
            aria-label={theme === 'dark' ? 'Mudar para Modo Claro' : 'Mudar para Modo Escuro'}
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-stone-300" />
            )}
          </button>

          {/* Shortcut: Nova Encomenda */}
          <button
            onClick={onNewOrder}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-500 rounded-xl shadow-xs transition-all active:scale-[0.98] whitespace-nowrap min-h-[36px]"
            title="Cadastrar nova encomenda"
          >
            <Plus className="w-3.5 h-3.5 shrink-0" />
            <span>+ Encomenda</span>
          </button>

          {/* Hamburger Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="w-9 h-9 rounded-xl bg-stone-800 hover:bg-stone-700 border border-stone-700/80 flex items-center justify-center text-stone-200 hover:text-white transition-all active:scale-[0.96] shadow-xs"
            title="Abrir menu de opções"
            aria-label="Abrir menu de opções"
          >
            <Menu className="w-4 h-4" />
          </button>
        </div>

        {/* Zone 4: Desktop Action Row */}
        <div className="hidden md:flex items-center gap-2 shrink-0">
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
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-500 rounded-xl shadow-xs transition-all active:scale-[0.98] whitespace-nowrap min-h-[40px]"
            >
              <Plus className="w-4 h-4 shrink-0" />
              <span>Nova Encomenda</span>
            </button>
          ) : (
            <>
              <button
                onClick={onOpenPaste}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-amber-300 bg-stone-800 hover:bg-stone-700 border border-stone-700 rounded-xl transition-all active:scale-[0.98] whitespace-nowrap min-h-[40px]"
                title="Importar receita colando o texto"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>Colar Receita</span>
              </button>

              <button
                onClick={onNewRecipe}
                className="flex items-center gap-1 px-3 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-500 rounded-xl shadow-xs transition-all active:scale-[0.98] whitespace-nowrap min-h-[40px]"
              >
                <Plus className="w-4 h-4 shrink-0" />
                <span>Nova Receita</span>
              </button>
            </>
          )}

          {/* Cloud Auth / User Profile */}
          <div className="relative">
            {user ? (
              <button
                onClick={() => setUserMenuOpen((prev) => !prev)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-stone-800 hover:bg-stone-700 border border-stone-700 rounded-xl transition-all active:scale-[0.98] text-xs font-medium text-stone-200 min-h-[40px]"
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
                <span className="max-w-[100px] truncate">
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
                <span>Salvar na Nuvem</span>
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

      {/* Mobile Drawer / Hamburger Sheet */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex justify-end">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in"
            onClick={() => setMobileMenuOpen(false)}
          />

          {/* Drawer Body */}
          <div className="relative w-full max-w-xs sm:max-w-sm h-full bg-stone-900 border-l border-stone-800 text-stone-100 p-5 flex flex-col justify-between shadow-2xl z-10 overflow-y-auto animate-in slide-in-from-right duration-200">
            <div className="space-y-5">
              {/* Top Drawer Title & Close */}
              <div className="flex items-center justify-between pb-3 border-b border-stone-800">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-amber-600 flex items-center justify-center text-white">
                    <ChefHat className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-white font-display">Caseirinhos Fer&Dre</h2>
                    <p className="text-[10px] text-stone-400">Menu Principal</p>
                  </div>
                </div>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-8 h-8 rounded-lg bg-stone-800 hover:bg-stone-700 flex items-center justify-center text-stone-400 hover:text-white transition-colors"
                  aria-label="Fechar menu"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Cloud Account Section */}
              <div className="p-3.5 bg-stone-800/80 border border-stone-700/80 rounded-2xl space-y-2.5">
                {user ? (
                  <div>
                    <div className="flex items-center gap-2.5 mb-2">
                      {user.photoURL ? (
                        <img
                          src={user.photoURL}
                          alt={user.displayName || 'Usuário'}
                          className="w-8 h-8 rounded-full object-cover border border-amber-500/50"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-amber-600 text-white font-bold flex items-center justify-center text-xs">
                          {(user.displayName || user.email || 'U')[0].toUpperCase()}
                        </div>
                      )}
                      <div className="overflow-hidden">
                        <p className="text-xs font-bold text-white truncate">
                          {user.displayName || 'Confeitaria'}
                        </p>
                        <p className="text-[11px] text-stone-400 truncate">
                          {user.email}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 mb-2.5 font-medium">
                      <CloudCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>Salvo e sincronizado na Nuvem</span>
                    </div>

                    <button
                      onClick={() => {
                        setMobileMenuOpen(false);
                        signOut();
                      }}
                      className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 text-xs font-semibold text-rose-400 hover:text-rose-300 bg-rose-950/30 hover:bg-rose-950/50 rounded-xl transition-colors border border-rose-900/40"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sair da conta</span>
                    </button>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center gap-2 text-amber-300 font-semibold text-xs mb-1">
                      <Cloud className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>Sincronizar na Nuvem</span>
                    </div>
                    <p className="text-[11px] text-stone-300 leading-relaxed mb-3">
                      Conecte sua conta para salvar receitas e encomendas no Firebase e nunca perder seus dados.
                    </p>
                    <button
                      onClick={() => {
                        setMobileMenuOpen(false);
                        onOpenAuth();
                      }}
                      className="w-full flex items-center justify-center gap-2 py-2 px-3 text-xs font-bold text-stone-950 bg-amber-400 hover:bg-amber-300 rounded-xl transition-colors shadow-xs"
                    >
                      <LogIn className="w-3.5 h-3.5" />
                      <span>Entrar / Criar Conta</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Quick Actions */}
              <div className="space-y-1.5">
                <p className="text-[10px] uppercase font-bold tracking-wider text-stone-400 px-1">
                  Ações Rápidas
                </p>

                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onNewOrder();
                  }}
                  className="w-full flex items-center justify-between p-2.5 bg-amber-600/90 hover:bg-amber-600 text-white rounded-xl text-xs font-semibold transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Plus className="w-4 h-4" />
                    <span>Nova Encomenda</span>
                  </div>
                  <span className="text-[10px] bg-amber-700/80 px-2 py-0.5 rounded-md font-bold">Atalho</span>
                </button>

                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onNewRecipe();
                  }}
                  className="w-full flex items-center justify-between p-2.5 bg-stone-800 hover:bg-stone-700/80 text-stone-200 hover:text-white rounded-xl text-xs font-semibold transition-colors border border-stone-700/60"
                >
                  <div className="flex items-center gap-2">
                    <Plus className="w-4 h-4 text-amber-400" />
                    <span>Nova Receita</span>
                  </div>
                </button>

                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenPaste();
                  }}
                  className="w-full flex items-center justify-between p-2.5 bg-stone-800 hover:bg-stone-700/80 text-stone-200 hover:text-white rounded-xl text-xs font-semibold transition-colors border border-stone-700/60"
                >
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <span>Colar Receita com IA</span>
                  </div>
                </button>
              </div>

              {/* Navigation Shortcuts */}
              <div className="space-y-1">
                <p className="text-[10px] uppercase font-bold tracking-wider text-stone-400 px-1 mb-1.5">
                  Navegação
                </p>

                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onNavigate('orders');
                  }}
                  className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-medium transition-colors ${
                    activeTab === 'orders'
                      ? 'bg-stone-800 text-amber-400 font-bold border border-amber-500/40'
                      : 'text-stone-300 hover:bg-stone-800 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    <span>Encomendas</span>
                  </div>
                  {openOrdersCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-[10px] font-bold">
                      {openOrdersCount} abertas
                    </span>
                  )}
                </button>

                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onNavigate('recs');
                  }}
                  className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-medium transition-colors ${
                    activeTab === 'recs'
                      ? 'bg-stone-800 text-amber-400 font-bold border border-amber-500/40'
                      : 'text-stone-300 hover:bg-stone-800 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Cake className="w-4 h-4" />
                    <span>Receitas</span>
                  </div>
                  <span className="text-[11px] text-stone-400">
                    {data.recs.length}
                  </span>
                </button>

                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onNavigate('ings');
                  }}
                  className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-medium transition-colors ${
                    activeTab === 'ings'
                      ? 'bg-stone-800 text-amber-400 font-bold border border-amber-500/40'
                      : 'text-stone-300 hover:bg-stone-800 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Egg className="w-4 h-4" />
                    <span>Ingredientes</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {missingPricesCount > 0 && (
                      <span className="px-1.5 py-0.5 rounded bg-rose-900/60 text-rose-300 text-[10px] font-bold">
                        {missingPricesCount} s/ preço
                      </span>
                    )}
                    <span className="text-[11px] text-stone-400">
                      {data.ings.length}
                    </span>
                  </div>
                </button>

                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onNavigate('scale');
                  }}
                  className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-medium transition-colors ${
                    activeTab === 'scale'
                      ? 'bg-stone-800 text-amber-400 font-bold border border-amber-500/40'
                      : 'text-stone-300 hover:bg-stone-800 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <ShoppingBag className="w-4 h-4" />
                    <span>Escalonar Produção</span>
                  </div>
                </button>

                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onNavigate('cfg');
                  }}
                  className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-medium transition-colors ${
                    activeTab === 'cfg'
                      ? 'bg-stone-800 text-amber-400 font-bold border border-amber-500/40'
                      : 'text-stone-300 hover:bg-stone-800 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Settings className="w-4 h-4" />
                    <span>Ajustes & Custos Fixos</span>
                  </div>
                </button>
              </div>
            </div>

            {/* Drawer Footer */}
            <div className="pt-4 border-t border-stone-800 flex items-center justify-between text-[11px] text-stone-400">
              <span>Caseirinhos Fer&Dre</span>
              <button
                onClick={() => onToggleTheme()}
                className="flex items-center gap-1.5 text-stone-300 hover:text-white"
              >
                {theme === 'dark' ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-stone-300" />}
                <span>{theme === 'dark' ? 'Modo Claro' : 'Modo Escuro'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
