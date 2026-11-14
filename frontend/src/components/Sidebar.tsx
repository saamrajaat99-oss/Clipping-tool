import React from 'react';
import { 
  LayoutDashboard, 
  Video, 
  Scissors, 
  Film, 
  ListOrdered, 
  Calendar, 
  Share2, 
  BarChart3, 
  Settings, 
  Cpu, 
  Zap, 
  Sparkles
} from 'lucide-react';
import { HardwareInfo } from '../types';

interface SidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  activeTasksCount: number;
  hardware?: HardwareInfo;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  setCurrentTab,
  activeTasksCount,
  hardware
}) => {
  const navItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'import', label: 'Import Videos', icon: Video },
    { id: 'studio', label: 'AI Clipping Studio', icon: Scissors, badge: 'AI' },
    { id: 'library', label: 'Video Library', icon: Film },
    { id: 'queue', label: 'Processing Queue', icon: ListOrdered, count: activeTasksCount },
    { id: 'calendar', label: 'Publishing Calendar', icon: Calendar },
    { id: 'platforms', label: 'Connected Platforms', icon: Share2 },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-[#0d0f17] border-r border-slate-800/80 flex flex-col justify-between shrink-0 h-screen sticky top-0 select-none">
      <div>
        {/* Brand Logo */}
        <div className="h-16 flex items-center px-6 border-b border-slate-800/80 gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="font-bold text-base tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
              AutoClip <span className="text-cyan-400 font-extrabold">AI</span>
            </span>
            <div className="text-[10px] text-slate-500 font-medium tracking-wider uppercase">
              Pro Studio & Publisher
            </div>
          </div>
        </div>

        {/* Navigation List */}
        <nav className="p-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentTab(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-indigo-600/15 text-indigo-400 border border-indigo-500/30 shadow-sm shadow-indigo-500/10'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-400' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>

                {item.badge && (
                  <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-md bg-gradient-to-r from-indigo-500 to-cyan-500 text-white">
                    {item.badge}
                  </span>
                )}

                {typeof item.count === 'number' && item.count > 0 && (
                  <span className="px-2 py-0.5 text-[11px] font-bold rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 animate-pulse">
                    {item.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Hardware Status Footer */}
      <div className="p-4 border-t border-slate-800/80">
        <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
              <Cpu className="w-3.5 h-3.5 text-emerald-400" />
              <span>Hardware Acceleration</span>
            </div>
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              NVENC Active
            </span>
          </div>

          <div className="text-[11px] text-slate-400 font-mono truncate">
            {hardware?.gpu_name || 'NVIDIA RTX 4060 Laptop GPU'}
          </div>
          <div className="flex items-center justify-between text-[10px] text-slate-500 mt-1">
            <span>VRAM: 8GB GDDR6</span>
            <span className="flex items-center gap-1 text-emerald-400">
              <Zap className="w-3 h-3 fill-emerald-400" /> 0% Cloud Cost
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
};
