import React from 'react';
import { Cake, Egg, Scale, Settings, Calendar } from 'lucide-react';
import { AppData } from '../types';

interface NavigationProps {
  activeTab: 'orders' | 'recs' | 'ings' | 'scale' | 'cfg';
  onNavigate: (tab: 'orders' | 'recs' | 'ings' | 'scale' | 'cfg') => void;
  data: AppData;
}

export const Navigation: React.FC<NavigationProps> = ({
  activeTab,
  onNavigate,
  data,
}) => {
  const missingPrices = (data.ings || []).filter((i) => i.price <= 0).length;
  const openOrdersCount = (data.orders || []).filter((o) => o.status !== 'entregue').length;

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-stone-900/95 backdrop-blur-md border-t border-stone-800 pb-[env(safe-area-inset-bottom,0px)] shadow-lg no-print">
      <div className="grid grid-cols-5 items-center h-16">
        <button
          onClick={() => onNavigate('orders')}
          className={`relative flex flex-col items-center justify-center h-full transition-colors min-h-[44px] ${
            activeTab === 'orders'
              ? 'text-amber-400 font-semibold'
              : 'text-stone-400 hover:text-stone-200'
          }`}
        >
          <Calendar className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] tracking-tight leading-none">Encomendas</span>
          {openOrdersCount > 0 && (
            <span className="absolute top-2 right-4 min-w-[16px] h-4 px-1 rounded-full bg-amber-500 text-stone-950 font-bold text-[9px] flex items-center justify-center">
              {openOrdersCount}
            </span>
          )}
        </button>

        <button
          onClick={() => onNavigate('recs')}
          className={`flex flex-col items-center justify-center h-full transition-colors min-h-[44px] ${
            activeTab === 'recs'
              ? 'text-amber-400 font-semibold'
              : 'text-stone-400 hover:text-stone-200'
          }`}
        >
          <Cake className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] tracking-tight leading-none">Receitas</span>
        </button>

        <button
          onClick={() => onNavigate('ings')}
          className={`relative flex flex-col items-center justify-center h-full transition-colors min-h-[44px] ${
            activeTab === 'ings'
              ? 'text-amber-400 font-semibold'
              : 'text-stone-400 hover:text-stone-200'
          }`}
        >
          <Egg className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] tracking-tight leading-none">Ingredientes</span>
          {missingPrices > 0 && (
            <span className="absolute top-2.5 right-4 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-stone-900" />
          )}
        </button>

        <button
          onClick={() => onNavigate('scale')}
          className={`flex flex-col items-center justify-center h-full transition-colors min-h-[44px] ${
            activeTab === 'scale'
              ? 'text-amber-400 font-semibold'
              : 'text-stone-400 hover:text-stone-200'
          }`}
        >
          <Scale className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] tracking-tight leading-none">Escalonar</span>
        </button>

        <button
          onClick={() => onNavigate('cfg')}
          className={`flex flex-col items-center justify-center h-full transition-colors min-h-[44px] ${
            activeTab === 'cfg'
              ? 'text-amber-400 font-semibold'
              : 'text-stone-400 hover:text-stone-200'
          }`}
        >
          <Settings className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] tracking-tight leading-none">Ajustes</span>
        </button>
      </div>
    </nav>
  );
};
