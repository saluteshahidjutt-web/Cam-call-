import React from 'react';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';
import { WifiOff } from 'lucide-react';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:right-auto sm:max-w-md z-50 flex items-center gap-2.5 rounded-2xl bg-zinc-900/90 text-white backdrop-blur-md px-4 py-2.5 text-xs font-medium shadow-xl border border-white/10 animate-in slide-in-from-bottom-2 duration-200">
      <div className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
        <WifiOff className="w-3.5 h-3.5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-xs text-amber-300">Offline Mode</p>
        <p className="text-[11px] text-zinc-300 truncate">
          No internet connection. Cached messages and app state available.
        </p>
      </div>
    </div>
  );
};
