import React from 'react';
import { Cake, Egg, Scale, Calendar, TrendingUp, Boxes } from 'lucide-react';
import { AppData } from '../types';

interface NavigationProps {
  activeTab: 'orders' | 'recs' | 'ings' | 'packagings' | 'scale' | 'cfg' | 'dashboard';
  onNavigate: (tab: 'orders' | 'recs' | 'ings' | 'packagings' | 'scale' | 'cfg' | 'dashboard') => void;
  data: AppData;
}

export const Navigation: React.FC<NavigationProps> = ({
  activeTab,
  onNavigate,
  data,
}) => {
  const missingPrices = (data.ings || []).filter((i) => i.price <= 0).length;
  const openOrdersCount = (data.orders || []).filter((o) => o.status !== 'entregue').length;
  const lowPackagingCount = (data.packagings || []).filter((p) => p.stock < p.minStock).length;

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-stone-900/95 backdrop-blur-md border-t border-stone-800 pb-[max(env(safe-area-inset-bottom,0px),6px)] shadow-2xl no-print">
      <div className="grid grid-cols-6 items-center h-16 px-0.5">
        <button
          type="button"
          onClick={() => onNavigate('orders')}
          className={`relative flex flex-col items-center justify-center h-full transition-all active:scale-95 min-h-[48px] rounded-xl ${
            activeTab === 'orders'
              ? 'text-amber-400 font-bold'
              : 'text-stone-400 hover:text-stone-200'
          }`}
        >
          <div className={`p-1 rounded-xl transition-colors ${activeTab === 'orders' ? 'bg-amber-500/15' : ''}`}>
            <Calendar className="w-4.5 h-4.5" />
          </div>
          <span className="text-[9px] tracking-tight leading-none mt-0.5">Pedidos</span>
          {openOrdersCount > 0 && (
            <span className="absolute top-1 right-1 min-w-[15px] h-[15px] px-0.5 rounded-full bg-amber-500 text-stone-950 font-bold text-[8px] flex items-center justify-center shadow-xs">
              {openOrdersCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => onNavigate('recs')}
          className={`flex flex-col items-center justify-center h-full transition-all active:scale-95 min-h-[48px] rounded-xl ${
            activeTab === 'recs'
              ? 'text-amber-400 font-bold'
              : 'text-stone-400 hover:text-stone-200'
          }`}
        >
          <div className={`p-1 rounded-xl transition-colors ${activeTab === 'recs' ? 'bg-amber-500/15' : ''}`}>
            <Cake className="w-4.5 h-4.5" />
          </div>
          <span className="text-[9px] tracking-tight leading-none mt-0.5">Receitas</span>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('ings')}
          className={`relative flex flex-col items-center justify-center h-full transition-all active:scale-95 min-h-[48px] rounded-xl ${
            activeTab === 'ings'
              ? 'text-amber-400 font-bold'
              : 'text-stone-400 hover:text-stone-200'
          }`}
        >
          <div className={`p-1 rounded-xl transition-colors ${activeTab === 'ings' ? 'bg-amber-500/15' : ''}`}>
            <Egg className="w-4.5 h-4.5" />
          </div>
          <span className="text-[9px] tracking-tight leading-none mt-0.5">Insumos</span>
          {missingPrices > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-stone-900" />
          )}
        </button>

        <button
          type="button"
          onClick={() => onNavigate('packagings')}
          className={`relative flex flex-col items-center justify-center h-full transition-all active:scale-95 min-h-[48px] rounded-xl ${
            activeTab === 'packagings'
              ? 'text-amber-400 font-bold'
              : 'text-stone-400 hover:text-stone-200'
          }`}
        >
          <div className={`p-1 rounded-xl transition-colors ${activeTab === 'packagings' ? 'bg-amber-500/15' : ''}`}>
            <Boxes className="w-4.5 h-4.5" />
          </div>
          <span className="text-[9px] tracking-tight leading-none mt-0.5">Embalagens</span>
          {lowPackagingCount > 0 && (
            <span className="absolute top-1 right-1 min-w-[15px] h-[15px] px-0.5 rounded-full bg-amber-500 text-stone-950 font-bold text-[8px] flex items-center justify-center shadow-xs">
              {lowPackagingCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => onNavigate('scale')}
          className={`flex flex-col items-center justify-center h-full transition-all active:scale-95 min-h-[48px] rounded-xl ${
            activeTab === 'scale'
              ? 'text-amber-400 font-bold'
              : 'text-stone-400 hover:text-stone-200'
          }`}
        >
          <div className={`p-1 rounded-xl transition-colors ${activeTab === 'scale' ? 'bg-amber-500/15' : ''}`}>
            <Scale className="w-4.5 h-4.5" />
          </div>
          <span className="text-[9px] tracking-tight leading-none mt-0.5">Escalonar</span>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('dashboard')}
          className={`flex flex-col items-center justify-center h-full transition-all active:scale-95 min-h-[48px] rounded-xl ${
            activeTab === 'dashboard'
              ? 'text-amber-400 font-bold'
              : 'text-stone-400 hover:text-stone-200'
          }`}
        >
          <div className={`p-1 rounded-xl transition-colors ${activeTab === 'dashboard' ? 'bg-amber-500/15' : ''}`}>
            <TrendingUp className="w-4.5 h-4.5" />
          </div>
          <span className="text-[9px] tracking-tight leading-none mt-0.5">Dashboard</span>
        </button>
      </div>
    </nav>
  );
};
