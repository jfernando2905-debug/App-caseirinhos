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
  TrendingUp,
  Boxes,
} from 'lucide-react';
import { AppData } from '../types';
import { useAuth } from '../context/AuthContext';

interface HeaderProps {
  data: AppData;
  onNewRecipe: () => void;
  onNewOrder: () => void;
  onOpenPaste: () => void;
  onOpenAuth: () => void;
  activeTab: 'orders' | 'recs' | 'ings' | 'packagings' | 'scale' | 'cfg' | 'dashboard';
  onNavigate: (tab: 'orders' | 'recs' | 'ings' | 'packagings' | 'scale' | 'cfg' | 'dashboard') => void;
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
    <header className="md:hidden sticky top-0 z-30 bg-stone-900 text-stone-100 border-b border-stone-800 shadow-md w-full max-w-full overflow-hidden select-none">
      <div className="max-w-6xl mx-auto px-2.5 sm:px-4 h-14 sm:h-16 flex items-center justify-between gap-1.5 sm:gap-3">
        {/* Zone 1: Mobile Wordmark & Logo */}
        <div 
          onClick={() => onNavigate('orders')}
          className="flex items-center gap-2 cursor-pointer select-none group min-w-0 flex-1"
        >
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-amber-600 flex items-center justify-center text-white shadow-xs transition-transform group-hover:scale-105 shrink-0">
            <ChefHat className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-xs sm:text-base font-bold tracking-tight text-white font-display leading-tight truncate">
              Caseirinhos Fer&Dre
            </h1>
            <p className="text-[10px] text-stone-400 font-normal leading-none truncate hidden min-[360px]:block">
              Encomendas & Confeitaria
            </p>
          </div>
        </div>

        {/* Zone 2: Mobile Action Buttons (Fixed Nova Encomenda + Hamburger Menu) */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Fixed "Nova Encomenda" Button always visible */}
          <button
            type="button"
            onClick={onNewOrder}
            className="h-8.5 sm:h-9 px-2.5 sm:px-3.5 text-xs font-bold text-white bg-amber-600 hover:bg-amber-500 rounded-xl shadow-xs transition-all active:scale-[0.97] flex items-center gap-1.5 shrink-0 cursor-pointer"
            title="Criar Nova Encomenda"
            aria-label="Criar Nova Encomenda"
          >
            <Plus className="w-4 h-4 shrink-0" />
            <span className="font-bold">Nova Encomenda</span>
          </button>

          {/* Hamburger Menu Button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className="w-8.5 h-8.5 sm:w-9 sm:h-9 rounded-xl bg-stone-800 hover:bg-stone-700 border border-stone-700/80 flex items-center justify-center text-stone-200 hover:text-white transition-all active:scale-[0.96] shadow-xs cursor-pointer"
            title="Abrir menu de opções"
            aria-label="Abrir menu de opções"
          >
            <Menu className="w-4.5 h-4.5" />
          </button>
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
          <div className="relative w-[85vw] max-w-xs sm:max-w-sm h-full bg-stone-900 border-l border-stone-800 text-stone-100 p-4 sm:p-5 flex flex-col justify-between shadow-2xl z-10 overflow-y-auto animate-in slide-in-from-right duration-200">
            <div className="space-y-4 sm:space-y-5">
              {/* Top Drawer Title & Close */}
              <div className="flex items-center justify-between pb-3 border-b border-stone-800">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-amber-600 flex items-center justify-center text-white shrink-0">
                    <ChefHat className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-sm sm:text-base font-bold text-white font-display truncate">Caseirinhos Fer&Dre</h2>
                    <p className="text-[10px] text-stone-400">Menu Principal</p>
                  </div>
                </div>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-8 h-8 rounded-xl bg-stone-800 hover:bg-stone-700 flex items-center justify-center text-stone-400 hover:text-white transition-colors shrink-0"
                  aria-label="Fechar menu"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Cloud Account Section */}
              <div className="p-3 bg-stone-800/80 border border-stone-700/80 rounded-2xl space-y-2">
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
                      <div className="overflow-hidden min-w-0">
                        <p className="text-xs font-bold text-white truncate">
                          {user.displayName || 'Confeitaria'}
                        </p>
                        <p className="text-[10px] text-stone-400 truncate">
                          {user.email}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] text-emerald-400 mb-2 font-medium">
                      <CloudCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>Salvo e sincronizado na Nuvem</span>
                    </div>

                    <button
                      onClick={() => {
                        setMobileMenuOpen(false);
                        signOut();
                      }}
                      className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 text-xs font-semibold text-rose-400 hover:text-rose-300 bg-rose-950/30 hover:bg-rose-950/50 rounded-xl transition-colors border border-rose-900/40 min-h-[36px]"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sair da conta</span>
                    </button>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center gap-1.5 text-amber-300 font-semibold text-xs mb-1">
                      <Cloud className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>Sincronizar na Nuvem</span>
                    </div>
                    <p className="text-[10px] text-stone-300 leading-relaxed mb-2.5">
                      Conecte sua conta para salvar receitas e encomendas na nuvem e evitar perda de dados.
                    </p>
                    <button
                      onClick={() => {
                        setMobileMenuOpen(false);
                        onOpenAuth();
                      }}
                      className="w-full flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-bold text-stone-950 bg-amber-400 hover:bg-amber-300 rounded-xl transition-colors shadow-xs min-h-[36px]"
                    >
                      <LogIn className="w-3.5 h-3.5" />
                      <span>Entrar / Criar Conta</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Appearance / Time-Based Theme Switcher */}
              <div className="p-3 bg-stone-800/50 border border-stone-800 rounded-2xl space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-stone-300">Aparência do Sistema</span>
                  <span className="text-[10px] text-amber-400 font-semibold bg-amber-950/60 border border-amber-800/60 px-2 py-0.5 rounded-md">
                    Auto por Horário
                  </span>
                </div>
                <button
                  type="button"
                  onClick={onToggleTheme}
                  className="w-full flex items-center justify-between p-2 bg-stone-800 hover:bg-stone-700/80 text-stone-200 rounded-xl text-xs font-semibold border border-stone-700/60 transition-colors min-h-[38px] cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    {theme === 'dark' ? <Moon className="w-4 h-4 text-amber-400" /> : <Sun className="w-4 h-4 text-amber-400" />}
                    <span>{theme === 'dark' ? 'Modo Escuro Ativo' : 'Modo Claro Ativo'}</span>
                  </div>
                  <span className="text-[10px] text-stone-400">
                    {theme === 'dark' ? '18h às 06h' : '06h às 18h'}
                  </span>
                </button>
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
                  className="w-full flex items-center justify-between p-2.5 bg-amber-600/90 hover:bg-amber-600 text-white rounded-xl text-xs font-semibold transition-colors min-h-[40px]"
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
                  className="w-full flex items-center justify-between p-2.5 bg-stone-800 hover:bg-stone-700/80 text-stone-200 hover:text-white rounded-xl text-xs font-semibold transition-colors border border-stone-700/60 min-h-[40px]"
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
                  className="w-full flex items-center justify-between p-2.5 bg-stone-800 hover:bg-stone-700/80 text-stone-200 hover:text-white rounded-xl text-xs font-semibold transition-colors border border-stone-700/60 min-h-[40px]"
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
                  className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-medium transition-colors min-h-[40px] ${
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
                  className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-medium transition-colors min-h-[40px] ${
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
                  className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-medium transition-colors min-h-[40px] ${
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
                    onNavigate('packagings');
                  }}
                  className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-medium transition-colors min-h-[40px] ${
                    activeTab === 'packagings'
                      ? 'bg-stone-800 text-amber-400 font-bold border border-amber-500/40'
                      : 'text-stone-300 hover:bg-stone-800 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Boxes className="w-4 h-4 text-amber-400" />
                    <span>Estoque Embalagens</span>
                  </div>
                  <span className="text-[11px] text-stone-400">
                    {data.packagings ? data.packagings.length : 0}
                  </span>
                </button>

                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onNavigate('scale');
                  }}
                  className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-medium transition-colors min-h-[40px] ${
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
                    onNavigate('dashboard');
                  }}
                  className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-medium transition-colors min-h-[40px] ${
                    activeTab === 'dashboard'
                      ? 'bg-stone-800 text-amber-400 font-bold border border-amber-500/40'
                      : 'text-stone-300 hover:bg-stone-800 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-emerald-400" />
                    <span>Dashboard Financeiro</span>
                  </div>
                  <span className="text-[10px] text-emerald-400 bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-900/40 font-semibold">
                    Gráficos
                  </span>
                </button>

                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onNavigate('cfg');
                  }}
                  className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-medium transition-colors min-h-[40px] ${
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
            <div className="pt-3 border-t border-stone-800 flex items-center justify-between text-[11px] text-stone-400 mt-4">
              <span>Caseirinhos Fer&Dre</span>
              <button
                onClick={() => onToggleTheme()}
                className="flex items-center gap-1.5 text-stone-300 hover:text-white py-1 px-2 rounded-lg bg-stone-800/60"
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

