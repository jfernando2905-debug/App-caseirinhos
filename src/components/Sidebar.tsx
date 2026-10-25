import React from 'react';
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
  Cake,
  Egg,
  Settings,
  TrendingUp,
} from 'lucide-react';
import { AppData } from '../types';
import { useAuth } from '../context/AuthContext';

interface SidebarProps {
  data: AppData;
  activeTab: 'orders' | 'recs' | 'ings' | 'scale' | 'cfg' | 'dashboard';
  onNavigate: (tab: 'orders' | 'recs' | 'ings' | 'scale' | 'cfg' | 'dashboard') => void;
  onNewOrder: () => void;
  onNewRecipe: () => void;
  onOpenPaste: () => void;
  onOpenAuth: () => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  data,
  activeTab,
  onNavigate,
  onNewOrder,
  onNewRecipe,
  onOpenPaste,
  onOpenAuth,
  theme,
  onToggleTheme,
}) => {
  const { user, signOut } = useAuth();
  const missingPricesCount = (data.ings || []).filter((i) => i.price <= 0).length;
  const openOrdersCount = (data.orders || []).filter((o) => o.status !== 'entregue').length;

  return (
    <aside className="hidden md:flex flex-col w-64 lg:w-72 shrink-0 h-screen sticky top-0 bg-stone-900 text-stone-100 border-r border-stone-800 z-30 select-none overflow-y-auto">
      {/* 1. Brand Wordmark Header */}
      <div className="p-5 border-b border-stone-800 flex items-center justify-between gap-3">
        <div
          onClick={() => onNavigate('orders')}
          className="flex items-center gap-3 cursor-pointer group min-w-0"
          title="Ir para Encomendas"
        >
          <div className="w-10 h-10 rounded-xl bg-amber-600 flex items-center justify-center text-white shadow-sm transition-transform group-hover:scale-105 shrink-0">
            <ChefHat className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-base font-bold tracking-tight text-white font-display leading-tight truncate">
              Caseirinhos Fer&Dre
            </h1>
            <p className="text-[11px] text-stone-400 font-normal leading-none mt-1 truncate">
              Gestão & Confeitaria
            </p>
          </div>
        </div>

        {/* Theme Toggle Button */}
        <button
          onClick={onToggleTheme}
          className="w-8 h-8 rounded-lg bg-stone-800 hover:bg-stone-700 border border-stone-700/80 flex items-center justify-center text-stone-300 hover:text-white transition-all active:scale-95 shadow-xs shrink-0"
          title={theme === 'dark' ? 'Mudar para Modo Claro' : 'Mudar para Modo Escuro'}
          aria-label={theme === 'dark' ? 'Mudar para Modo Claro' : 'Mudar para Modo Escuro'}
        >
          {theme === 'dark' ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4 text-stone-300" />
          )}
        </button>
      </div>

      {/* 2. Fast Actions Area */}
      <div className="p-4 space-y-2 border-b border-stone-800/80 bg-stone-950/40">
        <button
          onClick={onNewOrder}
          className="w-full flex items-center justify-center gap-2 px-3 py-2.5 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-500 rounded-xl shadow-xs transition-all active:scale-[0.98]"
        >
          <Plus className="w-4 h-4 shrink-0" />
          <span>Nova Encomenda</span>
        </button>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={onNewRecipe}
            className="flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-[11px] font-semibold text-stone-200 bg-stone-800 hover:bg-stone-700 border border-stone-700/80 rounded-xl transition-all active:scale-[0.98]"
            title="Criar nova receita manualmente"
          >
            <Plus className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>Receita</span>
          </button>

          <button
            onClick={onOpenPaste}
            className="flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-[11px] font-semibold text-amber-300 bg-stone-800 hover:bg-stone-700 border border-amber-600/30 rounded-xl transition-all active:scale-[0.98]"
            title="Colar texto de receita e interpretar com IA"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>Colar com IA</span>
          </button>
        </div>
      </div>

      {/* 3. Navigation Links List */}
      <div className="flex-1 p-3 space-y-6 overflow-y-auto">
        {/* Main Section */}
        <div className="space-y-1">
          <p className="px-3 text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-2">
            Operação
          </p>

          {/* Encomendas */}
          <button
            onClick={() => onNavigate('orders')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-colors ${
              activeTab === 'orders'
                ? 'bg-amber-600/15 text-amber-400 font-bold border border-amber-500/40 shadow-xs'
                : 'text-stone-300 hover:bg-stone-800 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Calendar className="w-4 h-4 shrink-0" />
              <span>Encomendas</span>
            </div>
            {openOrdersCount > 0 ? (
              <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-[10px] font-bold">
                {openOrdersCount} abertas
              </span>
            ) : (
              <span className="text-[11px] text-stone-500">
                {data.orders ? data.orders.length : 0}
              </span>
            )}
          </button>

          {/* Receitas */}
          <button
            onClick={() => onNavigate('recs')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-colors ${
              activeTab === 'recs'
                ? 'bg-amber-600/15 text-amber-400 font-bold border border-amber-500/40 shadow-xs'
                : 'text-stone-300 hover:bg-stone-800 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Cake className="w-4 h-4 shrink-0" />
              <span>Receitas</span>
            </div>
            <span className="text-[11px] text-stone-500">
              {data.recs ? data.recs.length : 0}
            </span>
          </button>

          {/* Ingredientes */}
          <button
            onClick={() => onNavigate('ings')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-colors ${
              activeTab === 'ings'
                ? 'bg-amber-600/15 text-amber-400 font-bold border border-amber-500/40 shadow-xs'
                : 'text-stone-300 hover:bg-stone-800 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Egg className="w-4 h-4 shrink-0" />
              <span>Ingredientes</span>
            </div>
            <div className="flex items-center gap-1.5">
              {missingPricesCount > 0 && (
                <span className="px-1.5 py-0.5 rounded bg-rose-950/80 text-rose-300 text-[10px] font-bold border border-rose-800/60">
                  {missingPricesCount} s/ preço
                </span>
              )}
              <span className="text-[11px] text-stone-500">
                {data.ings ? data.ings.length : 0}
              </span>
            </div>
          </button>

          {/* Escalonar Produção */}
          <button
            onClick={() => onNavigate('scale')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-colors ${
              activeTab === 'scale'
                ? 'bg-amber-600/15 text-amber-400 font-bold border border-amber-500/40 shadow-xs'
                : 'text-stone-300 hover:bg-stone-800 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <ShoppingBag className="w-4 h-4 shrink-0" />
              <span>Escalonar Produção</span>
            </div>
          </button>
        </div>

        {/* Management & Intelligence Section */}
        <div className="space-y-1 pt-2 border-t border-stone-800/80">
          <p className="px-3 text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-2">
            Gestão & Análise
          </p>

          {/* Dashboard Financeiro */}
          <button
            onClick={() => onNavigate('dashboard')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-colors ${
              activeTab === 'dashboard'
                ? 'bg-amber-600/15 text-amber-400 font-bold border border-amber-500/40 shadow-xs'
                : 'text-stone-300 hover:bg-stone-800 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <TrendingUp className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Dashboard Financeiro</span>
            </div>
            <span className="text-[10px] text-emerald-400 bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-900/40 font-semibold">
              Gráficos
            </span>
          </button>

          {/* Ajustes & Custos Fixos */}
          <button
            onClick={() => onNavigate('cfg')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-colors ${
              activeTab === 'cfg'
                ? 'bg-amber-600/15 text-amber-400 font-bold border border-amber-500/40 shadow-xs'
                : 'text-stone-300 hover:bg-stone-800 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Settings className="w-4 h-4 shrink-0" />
              <span>Ajustes & Custos Fixos</span>
            </div>
          </button>
        </div>
      </div>

      {/* 4. Bottom User Profile & Cloud Sync Card */}
      <div className="p-3 border-t border-stone-800 bg-stone-950/50 space-y-2">
        {user ? (
          <div className="p-2.5 bg-stone-900 rounded-xl border border-stone-800 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-amber-600/20 text-amber-400 border border-amber-500/30 flex items-center justify-center font-bold text-xs shrink-0">
                  {user.displayName ? user.displayName.charAt(0).toUpperCase() : user.email ? user.email.charAt(0).toUpperCase() : 'U'}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-white truncate leading-tight">
                    {user.displayName || user.email?.split('@')[0] || 'Usuário Conectado'}
                  </p>
                  <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-medium">
                    <CloudCheck className="w-3 h-3 text-emerald-400 shrink-0" />
                    <span>Nuvem Ativa</span>
                  </span>
                </div>
              </div>

              <button
                onClick={() => signOut()}
                className="p-1.5 rounded-lg text-stone-400 hover:text-rose-400 hover:bg-rose-950/30 transition-colors"
                title="Desconectar da conta"
                aria-label="Desconectar"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={onOpenAuth}
            className="w-full flex items-center justify-between p-2.5 bg-stone-900 hover:bg-stone-850 rounded-xl border border-stone-800 text-stone-300 hover:text-white transition-colors group text-left"
          >
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-stone-800 flex items-center justify-center text-stone-400 group-hover:text-amber-400 transition-colors shrink-0">
                <Cloud className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-white leading-tight">Salvar na Nuvem</p>
                <p className="text-[10px] text-stone-500">Modo Local Offline</p>
              </div>
            </div>
            <LogIn className="w-3.5 h-3.5 text-stone-400 group-hover:text-amber-400 shrink-0" />
          </button>
        )}

        <div className="px-2 pt-1 flex items-center justify-between text-[10px] text-stone-500 font-mono">
          <span>Caseirinhos Fer&Dre</span>
          <span>v1.2</span>
        </div>
      </div>
    </aside>
  );
};
