import React from 'react';
import { PlusCircle, RefreshCw, HardDrive, ShieldCheck, Activity } from 'lucide-react';

interface HeaderProps {
  onQuickImport: () => void;
  onRefresh: () => void;
  isRefreshing: boolean;
  storageFreeGb?: number;
}

export const Header: React.FC<HeaderProps> = ({
  onQuickImport,
  onRefresh,
  isRefreshing,
  storageFreeGb
}) => {
  return (
    <header className="h-16 border-b border-slate-800/80 bg-[#0d0f17]/80 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-20">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-xs font-medium text-slate-300">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
          <span className="text-slate-400">System:</span>
          <span className="text-emerald-400 font-semibold">Local Laptop Studio</span>
        </div>

        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-xs text-slate-400">
          <HardDrive className="w-3.5 h-3.5 text-indigo-400" />
          <span>Free Disk:</span>
          <span className="text-slate-200 font-mono font-medium">
            {storageFreeGb ? `${storageFreeGb} GB` : 'Available'}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          className="p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-800 transition-colors"
          title="Refresh Data"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-indigo-400' : ''}`} />
        </button>

        <button
          onClick={onQuickImport}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white text-sm font-semibold shadow-lg shadow-indigo-500/25 transition-all"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Import Videos</span>
        </button>
      </div>
    </header>
  );
};
