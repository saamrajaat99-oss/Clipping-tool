import React, { useState } from 'react';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  Send, 
  Share2, 
  CheckCircle2, 
  AlertCircle,
  Film
} from 'lucide-react';
import { Clip } from '../types';
import { api } from '../services/api';

interface PublishingCalendarProps {
  clips: Clip[];
  onRefresh: () => void;
  onOpenExportModal: (clipId: string) => void;
}

export const PublishingCalendar: React.FC<PublishingCalendarProps> = ({
  clips,
  onRefresh,
  onOpenExportModal
}) => {
  const scheduledClips = clips.filter(c => c.status === 'scheduled');
  const publishedClips = clips.filter(c => c.status === 'published');

  const [publishingId, setPublishingId] = useState<string | null>(null);

  const handlePublishNow = async (clipId: string) => {
    setPublishingId(clipId);
    try {
      await api.publishClip(clipId, ['youtube', 'instagram', 'tiktok']);
      onRefresh();
    } catch (err: any) {
      alert(`Publishing failed: ${err.message}`);
    } finally {
      setPublishingId(null);
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
          <CalendarIcon className="w-6 h-6 text-indigo-400" />
          <span>Publishing Schedule & Content Calendar</span>
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Review automated scheduled posts across YouTube Shorts, Instagram Reels, TikTok, and LinkedIn.
        </p>
      </div>

      {/* Scheduled Queue Cards */}
      <div className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-2">
          <Clock className="w-4 h-4 text-purple-400" />
          <span>Upcoming Scheduled Posts ({scheduledClips.length})</span>
        </h2>

        {scheduledClips.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {scheduledClips.map((clip) => (
              <div
                key={clip.id}
                className="p-5 rounded-2xl bg-[#12141d]/90 border border-slate-800/80 space-y-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-purple-500/10 text-purple-400 border border-purple-500/20">
                      Scheduled
                    </span>
                    <h3 className="text-sm font-bold text-white line-clamp-1">
                      {clip.title}
                    </h3>
                  </div>

                  <span className="text-xs font-mono text-purple-300 bg-purple-900/30 px-2.5 py-1 rounded-lg border border-purple-800/50">
                    {clip.scheduled_at ? new Date(clip.scheduled_at).toLocaleString() : 'Pending Date'}
                  </span>
                </div>

                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300">YouTube Shorts</span>
                  <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300">Instagram Reels</span>
                  <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300">TikTok</span>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                  <button
                    onClick={() => onOpenExportModal(clip.id)}
                    className="text-xs text-slate-400 hover:text-indigo-400 transition-colors"
                  >
                    Export Package
                  </button>

                  <button
                    onClick={() => handlePublishNow(clip.id)}
                    disabled={publishingId === clip.id}
                    className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
                  >
                    <Send className="w-3 h-3" />
                    <span>{publishingId === clip.id ? 'Publishing...' : 'Publish Now'}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center border border-dashed border-slate-800 rounded-2xl text-slate-500 text-sm">
            No clips currently scheduled. Open a clip in AI Clipping Studio to set a schedule date!
          </div>
        )}
      </div>

      {/* Recently Published Section */}
      <div className="space-y-4 pt-4 border-t border-slate-800/80">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>Recently Published ({publishedClips.length})</span>
        </h2>

        {publishedClips.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {publishedClips.map((clip) => (
              <div
                key={clip.id}
                className="p-4 rounded-xl bg-[#12141d]/90 border border-slate-800/80 space-y-2"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="text-emerald-400 font-bold uppercase text-[10px]">Published</span>
                  <span className="text-slate-500 font-mono text-[10px]">
                    {clip.published_at ? new Date(clip.published_at).toLocaleDateString() : 'Recent'}
                  </span>
                </div>
                <h3 className="text-xs font-bold text-white line-clamp-1">{clip.title}</h3>
                <p className="text-[11px] text-slate-400 line-clamp-1">{clip.hashtags}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-6 text-center border border-dashed border-slate-800 rounded-xl text-slate-500 text-xs">
            No clips marked as published yet.
          </div>
        )}
      </div>
    </div>
  );
};
