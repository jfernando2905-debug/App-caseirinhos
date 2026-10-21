import React from 'react';
import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed bottom-20 md:bottom-6 left-4 z-50 flex items-center gap-2 px-3.5 py-2 bg-stone-900/95 dark:bg-stone-800/95 text-amber-300 border border-amber-500/40 rounded-xl shadow-xl text-xs font-semibold backdrop-blur-xs animate-in fade-in duration-200">
      <WifiOff className="w-4 h-4 text-amber-400 shrink-0" />
      <span>Modo Offline — Suas receitas e pedidos salvos continuam disponíveis.</span>
    </div>
  );
};
