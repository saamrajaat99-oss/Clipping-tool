import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  CheckCircle2, 
  AlertTriangle, 
  HardDrive, 
  ExternalLink,
  Clock,
  Layers
} from 'lucide-react';
import { AnalyticsData } from '../types';
import { api } from '../services/api';

interface AnalyticsDashboardProps {
  analytics: AnalyticsData | null;
}

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ analytics }) => {
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    api.getPublishingHistory().then(setHistory).catch(console.error);
  }, []);

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

  const sources = analytics?.source_distribution || [];
  const platforms = analytics?.platform_distribution || [];
  const storage = analytics?.storage;

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
          <BarChart3 className="w-6 h-6 text-indigo-400" />
          <span>Publishing & Storage Analytics</span>
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Detailed metrics covering video processing volume, publishing success rates, and local laptop storage consumption.
        </p>
      </div>

      {/* Top 3 High-Level KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-2xl bg-[#12141d]/90 border border-slate-800/80 space-y-2">
          <span className="text-xs text-slate-400 font-medium">Publishing Success Rate</span>
          <div className="text-3xl font-extrabold text-emerald-400 font-mono">
            {m.success_rate}%
          </div>
          <p className="text-[11px] text-slate-500">
            {m.published_success} successful / {m.published_success + m.published_failed} total uploads
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-[#12141d]/90 border border-slate-800/80 space-y-2">
          <span className="text-xs text-slate-400 font-medium">Total Clips Generated</span>
          <div className="text-3xl font-extrabold text-cyan-400 font-mono">
            {m.total_clips}
          </div>
          <p className="text-[11px] text-slate-500">
            Across {m.total_videos} long source videos
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-[#12141d]/90 border border-slate-800/80 space-y-2">
          <span className="text-xs text-slate-400 font-medium">Total App Disk Usage</span>
          <div className="text-3xl font-extrabold text-indigo-400 font-mono">
            {storage ? `${storage.total_app_storage_mb} MB` : '0 MB'}
          </div>
          <p className="text-[11px] text-slate-500">
            {storage?.free_disk_gb} GB free on personal laptop drive
          </p>
        </div>
      </div>

      {/* Distribution Grids */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Most Frequently Used Video Sources */}
        <div className="p-6 rounded-2xl bg-[#12141d]/90 border border-slate-800/80 space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
            Most Frequently Used Video Sources
          </h2>

          <div className="space-y-3">
            {sources.length > 0 ? (
              sources.map((s, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs">
                  <span className="capitalize font-semibold text-slate-300">{s.platform}</span>
                  <div className="flex items-center gap-3">
                    <div className="w-32 h-2 bg-slate-900 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-indigo-500 rounded-full"
                        style={{ width: `${Math.min((s.count / m.total_videos) * 100, 100)}%` }}
                      />
                    </div>
                    <span className="font-mono text-slate-400 font-bold">{s.count}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-xs text-slate-500 text-center py-4">No video sources recorded yet.</div>
            )}
          </div>
        </div>

        {/* Platform Publishing Stats */}
        <div className="p-6 rounded-2xl bg-[#12141d]/90 border border-slate-800/80 space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
            Destination Platform Distribution
          </h2>

          <div className="space-y-3">
            {platforms.length > 0 ? (
              platforms.map((p, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs">
                  <span className="capitalize font-semibold text-slate-300">{p.platform}</span>
                  <div className="flex items-center gap-3">
                    <div className="w-32 h-2 bg-slate-900 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-cyan-400 rounded-full"
                        style={{ width: `${Math.min((p.count / (m.published_success || 1)) * 100, 100)}%` }}
                      />
                    </div>
                    <span className="font-mono text-slate-400 font-bold">{p.count}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-xs text-slate-500 text-center py-4">No published clips recorded yet.</div>
            )}
          </div>
        </div>
      </div>

      {/* Publishing Audit History Table */}
      <div className="p-6 rounded-2xl bg-[#12141d]/90 border border-slate-800/80 space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
          Publishing Audit History & Logs
        </h2>

        {history.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-800 text-slate-500 uppercase font-mono text-[10px]">
                <tr>
                  <th className="pb-3">Date</th>
                  <th className="pb-3">Clip</th>
                  <th className="pb-3">Platform</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3">Post URL / Log</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {history.map((h) => (
                  <tr key={h.id} className="hover:bg-slate-900/40">
                    <td className="py-3 text-slate-400">
                      {new Date(h.published_at).toLocaleString()}
                    </td>
                    <td className="py-3 text-white font-sans font-semibold max-w-xs truncate">
                      {h.clip_title || 'Generated Clip'}
                    </td>
                    <td className="py-3 capitalize text-slate-300">{h.platform}</td>
                    <td className="py-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        h.status === 'published' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                      }`}>
                        {h.status}
                      </span>
                    </td>
                    <td className="py-3 text-slate-400 truncate max-w-xs">
                      {h.post_url ? (
                        <a href={h.post_url} target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline flex items-center gap-1">
                          <span>View Post</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : (
                        h.error_message || 'Completed'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-xs text-slate-500 text-center py-6">
            No publishing events logged yet.
          </div>
        )}
      </div>
    </div>
  );
};
