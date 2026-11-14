import React from 'react';
import { 
  Video, 
  Scissors, 
  Loader2, 
  CheckCircle2, 
  Clock, 
  Send, 
  AlertTriangle,
  ArrowRight,
  HardDrive,
  Sparkles,
  TrendingUp,
  Share2
} from 'lucide-react';
import { AnalyticsData, Task } from '../types';

interface OverviewProps {
  analytics: AnalyticsData | null;
  onNavigate: (tab: string) => void;
}

export const Overview: React.FC<OverviewProps> = ({ analytics, onNavigate }) => {
  const m = analytics?.metrics || {
    total_videos: 0,
    total_clips: 0,
    currently_processing: 0,
    ready_to_publish: 0,
    scheduled_posts: 0,
    published_success: 0,
    published_failed: 0,
    success_rate: 100
  };

  const cards = [
    { label: 'Total Videos Imported', value: m.total_videos, icon: Video, color: 'text-indigo-400', bg: 'bg-indigo-500/10', border: 'border-indigo-500/20' },
    { label: 'Total Clips Generated', value: m.total_clips, icon: Scissors, color: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/20' },
    { label: 'Currently Processing', value: m.currently_processing, icon: Loader2, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20', animate: m.currently_processing > 0 },
    { label: 'Ready to Publish', value: m.ready_to_publish, icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
    { label: 'Scheduled Posts', value: m.scheduled_posts, icon: Clock, color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20' },
    { label: 'Successfully Published', value: m.published_success, icon: Send, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
    { label: 'Failed Publishing', value: m.published_failed, icon: AlertTriangle, color: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/20' },
  ];

  const storage = analytics?.storage;

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Hero Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl p-7 bg-gradient-to-r from-indigo-950/60 via-slate-900 to-[#0e121d] border border-indigo-500/30 shadow-2xl">
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/40 text-xs font-semibold text-indigo-300">
              <Sparkles className="w-3.5 h-3.5" />
              <span>AI Video Clipper & Auto-Publisher Active</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white">
              Transform Long Videos into High-Impact Shorts
            </h1>
            <p className="text-sm text-slate-400 max-w-xl">
              Paste video URLs from YouTube, Drive, Twitch, or Dropbox. The AI detects virality hooks, crops to 9:16 vertical, adds animated subtitles, and publishes automatically.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => onNavigate('import')}
              className="px-5 py-3 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-white font-semibold text-sm shadow-xl shadow-indigo-500/20 flex items-center gap-2 transition-all"
            >
              <span>Import New Videos</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => onNavigate('queue')}
              className="px-4 py-3 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-200 border border-slate-700 text-sm font-medium transition-all"
            >
              View Queue
            </button>
          </div>
        </div>
      </div>

      {/* 7 KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3.5">
        {cards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div
              key={idx}
              className={`p-4 rounded-xl bg-[#12141d]/90 border ${card.border} flex flex-col justify-between hover:border-slate-600 transition-all shadow-sm`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-medium text-slate-400 line-clamp-1">{card.label}</span>
                <div className={`p-1.5 rounded-lg ${card.bg}`}>
                  <Icon className={`w-3.5 h-3.5 ${card.color} ${card.animate ? 'animate-spin' : ''}`} />
                </div>
              </div>
              <div className="text-2xl font-bold text-white font-mono">
                {card.value}
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom Section: Active Queue Preview + Storage Meter */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Queue Activity */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-[#12141d]/90 border border-slate-800/80 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-indigo-400" />
              <h2 className="text-base font-semibold text-white">Recent Queue Tasks</h2>
            </div>
            <button
              onClick={() => onNavigate('queue')}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1"
            >
              Open Queue <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {analytics?.recent_tasks && analytics.recent_tasks.length > 0 ? (
              analytics.recent_tasks.map((task: Task) => (
                <div
                  key={task.id}
                  className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between gap-4"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="text-xs font-semibold text-slate-200 truncate">
                      {task.video_title || 'Video Processing Pipeline'}
                    </div>
                    <div className="text-[11px] text-slate-400 flex items-center gap-2">
                      <span className="capitalize px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300">
                        {task.status}
                      </span>
                      <span className="truncate">{task.status_message}</span>
                    </div>
                  </div>

                  <div className="shrink-0 text-right">
                    <div className="text-xs font-mono font-bold text-indigo-400">
                      {Math.round(task.progress)}%
                    </div>
                    <div className="w-20 h-1.5 bg-slate-800 rounded-full mt-1 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-indigo-500 to-cyan-400 rounded-full transition-all duration-300"
                        style={{ width: `${task.progress}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center border border-dashed border-slate-800 rounded-xl text-slate-500 text-sm">
                No active tasks in queue. Click "Import New Videos" to begin.
              </div>
            )}
          </div>
        </div>

        {/* Local Storage Meter */}
        <div className="p-6 rounded-2xl bg-[#12141d]/90 border border-slate-800/80 space-y-4">
          <div className="flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-cyan-400" />
            <h2 className="text-base font-semibold text-white">Local Laptop Storage</h2>
          </div>

          {storage ? (
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs text-slate-400 mb-1.5">
                  <span>Disk Used ({storage.used_disk_gb} GB / {storage.total_disk_gb} GB)</span>
                  <span className="font-semibold text-slate-200">{storage.percent_used}%</span>
                </div>
                <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 via-cyan-400 to-emerald-400 rounded-full"
                    style={{ width: `${storage.percent_used}%` }}
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800/80 space-y-2 text-xs">
                <div className="flex justify-between text-slate-400">
                  <span>Generated Clips</span>
                  <span className="font-mono text-slate-200">{storage.generated_clips_mb} MB</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Original Videos</span>
                  <span className="font-mono text-slate-200">{storage.original_videos_mb} MB</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Thumbnails & Subtitles</span>
                  <span className="font-mono text-slate-200">
                    {(storage.thumbnails_mb + storage.subtitles_mb).toFixed(1)} MB
                  </span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Total App Storage</span>
                  <span className="font-mono text-cyan-400 font-bold">
                    {storage.total_app_storage_mb} MB
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-xs text-slate-500">Storage metrics loading...</div>
          )}
        </div>
      </div>
    </div>
  );
};
