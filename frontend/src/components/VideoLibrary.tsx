import React, { useState } from 'react';
import { 
  Film, 
  Scissors, 
  Search, 
  Play, 
  Clock, 
  Share2, 
  Trash2, 
  Sparkles, 
  Download, 
  Filter,
  CheckCircle2,
  Layers,
  Check,
  RefreshCw,
  Plus
} from 'lucide-react';
import { Clip, Video } from '../types';
import { api } from '../services/api';

interface VideoLibraryProps {
  clips: Clip[];
  videos: Video[];
  onSelectClip: (clip: Clip) => void;
  onRefresh: () => void;
  onOpenExportModal: (clipId: string) => void;
}

export const VideoLibrary: React.FC<VideoLibraryProps> = ({
  clips,
  videos,
  onSelectClip,
  onRefresh,
  onOpenExportModal
}) => {
  const [activeTab, setActiveTab] = useState<'clips' | 'videos'>('clips');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedClipIds, setSelectedClipIds] = useState<string[]>([]);
  const [compilationTransition, setCompilationTransition] = useState<string>('fade');
  const [isCompiling, setIsCompiling] = useState<boolean>(false);
  const [compilingMsg, setCompilingMsg] = useState<string>('');

  const filteredClips = clips.filter(c => {
    const matchesSearch = c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (c.video_title && c.video_title.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredVideos = videos.filter(v => 
    v.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    v.platform.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleSelectClip = (clipId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedClipIds.includes(clipId)) {
      setSelectedClipIds(selectedClipIds.filter(id => id !== clipId));
    } else {
      if (selectedClipIds.length >= 8) {
        alert('You can select up to 8 clips to compile into a single short.');
        return;
      }
      setSelectedClipIds([...selectedClipIds, clipId]);
    }
  };

  const handleCreateCompilation = async () => {
    if (selectedClipIds.length < 2) {
      alert('Please select at least 2 clips (e.g. 4-5 clips) to merge.');
      return;
    }
    setIsCompiling(true);
    setCompilingMsg(`Stitching ${selectedClipIds.length} clips with ${compilationTransition} transitions...`);
    try {
      const res = await api.createCompilation({
        clip_ids: selectedClipIds,
        transition_type: compilationTransition
      });
      if (res.success) {
        setSelectedClipIds([]);
        onRefresh();
        if (res.clip) {
          onSelectClip(res.clip);
        }
      } else {
        alert(`Compilation failed: ${res.detail || 'Unknown error'}`);
      }
    } catch (err: any) {
      alert(`Error creating compilation: ${err.message}`);
    } finally {
      setIsCompiling(false);
      setCompilingMsg('');
    }
  };

  const handleDeleteClip = async (clipId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Delete this clip and its media files?')) return;
    try {
      await api.deleteClip(clipId);
      setSelectedClipIds(selectedClipIds.filter(id => id !== clipId));
      onRefresh();
    } catch (err: any) {
      alert(`Delete failed: ${err.message}`);
    }
  };

  const handleDeleteVideo = async (videoId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Delete this source video and all its generated clips?')) return;
    try {
      await api.deleteVideo(videoId);
      onRefresh();
    } catch (err: any) {
      alert(`Delete failed: ${err.message}`);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <Film className="w-6 h-6 text-indigo-400" />
            <span>Video & Clip Library</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Browse, preview, and manage all your generated short clips and imported source videos.
          </p>
        </div>

        {/* View Switcher */}
        <div className="flex p-1 rounded-xl bg-slate-900 border border-slate-800 self-start">
          <button
            onClick={() => setActiveTab('clips')}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
              activeTab === 'clips'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Scissors className="w-3.5 h-3.5" />
            <span>Generated Clips ({clips.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('videos')}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
              activeTab === 'videos'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Film className="w-3.5 h-3.5" />
            <span>Source Videos ({videos.length})</span>
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={activeTab === 'clips' ? 'Search clips by title...' : 'Search imported videos...'}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#12141d]/90 border border-slate-800 focus:border-indigo-500 text-xs text-white outline-none placeholder-slate-500"
          />
        </div>

        {activeTab === 'clips' && (
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2.5 rounded-xl bg-[#12141d]/90 border border-slate-800 text-xs text-slate-300 outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="ready">Ready to Publish</option>
            <option value="scheduled">Scheduled</option>
            <option value="published">Published</option>
          </select>
        )}
      </div>

      {/* Multi-Clip Compilation Toolbar when clips are selected */}
      {selectedClipIds.length > 0 && activeTab === 'clips' && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-950/90 via-slate-900 to-indigo-950/90 border border-indigo-500/40 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-white flex items-center gap-2">
                <span>{selectedClipIds.length} Clip(s) Selected</span>
                <span className="text-xs font-normal text-slate-400">
                  {selectedClipIds.length >= 2 ? '(Ready to merge into single short)' : '(Select at least 2 clips)'}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Stitches selected clips into a continuous short with smooth transitions & synchronized word captions.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <select
              value={compilationTransition}
              onChange={(e) => setCompilationTransition(e.target.value)}
              className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-slate-200 outline-none"
            >
              <option value="fade">Crossfade Transition</option>
              <option value="slideup">Slide Up Transition</option>
              <option value="slidedown">Slide Down Transition</option>
              <option value="wipeleft">Wipe Left Transition</option>
              <option value="wiperight">Wipe Right Transition</option>
              <option value="circleopen">Circle Iris Transition</option>
              <option value="fadeblack">Dip to Black Transition</option>
            </select>

            <button
              onClick={handleCreateCompilation}
              disabled={selectedClipIds.length < 2 || isCompiling}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 flex items-center gap-2 disabled:opacity-50 transition-all shrink-0"
            >
              {isCompiling ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Stitching Video...</span>
                </>
              ) : (
                <>
                  <Layers className="w-3.5 h-3.5" />
                  <span>Merge into Single Short Video</span>
                </>
              )}
            </button>

            <button
              onClick={() => setSelectedClipIds([])}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 text-xs transition-colors shrink-0"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {compilingMsg && (
        <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs flex items-center gap-2">
          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          <span>{compilingMsg}</span>
        </div>
      )}

      {/* Grid Display */}
      {activeTab === 'clips' ? (
        filteredClips.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filteredClips.map((clip) => {
              const thumbUrl = clip.thumbnail_path
                ? `/storage/Thumbnails/${clip.thumbnail_path.split(/[\\/]/).pop()}`
                : '';
              const isSelected = selectedClipIds.includes(clip.id);
              const isCompilation = clip.title.includes('Compilation') || (clip.description && clip.description.includes('stitched'));

              return (
                <div
                  key={clip.id}
                  onClick={() => onSelectClip(clip)}
                  className={`group relative rounded-2xl bg-[#12141d]/90 overflow-hidden cursor-pointer flex flex-col transition-all duration-200 shadow-md hover:shadow-xl ${
                    isSelected
                      ? 'border-2 border-indigo-500 ring-2 ring-indigo-500/40'
                      : isCompilation
                      ? 'border border-amber-500/60 shadow-amber-500/10'
                      : 'border border-slate-800/80 hover:border-indigo-500/50'
                  }`}
                >
                  {/* Thumbnail Container */}
                  <div className="relative aspect-[9/16] bg-slate-950 overflow-hidden flex items-center justify-center">
                    {thumbUrl ? (
                      <img
                        src={thumbUrl}
                        alt={clip.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <Scissors className="w-8 h-8 text-slate-700" />
                    )}

                    {/* Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30" />

                    {/* Multi-Clip Selection Checkbox */}
                    <button
                      onClick={(e) => toggleSelectClip(clip.id, e)}
                      className={`absolute top-3 left-3 z-10 w-6 h-6 rounded-lg flex items-center justify-center transition-all ${
                        isSelected
                          ? 'bg-indigo-600 text-white shadow-md'
                          : 'bg-black/60 backdrop-blur-md text-slate-400 hover:text-white border border-white/20'
                      }`}
                      title={isSelected ? 'Deselect clip' : 'Select for multi-clip compilation short'}
                    >
                      {isSelected ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                    </button>

                    {/* Virality / Compilation Badge */}
                    <div className="absolute top-3 left-11 px-2.5 py-0.5 rounded-full bg-black/60 backdrop-blur-md border border-slate-700 text-[10px] font-bold flex items-center gap-1">
                      {isCompilation ? (
                        <>
                          <Layers className="w-3 h-3 text-amber-400" />
                          <span className="text-amber-300 font-extrabold">Compilation Short</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3 h-3 text-cyan-400" />
                          <span className="text-cyan-300">{clip.virality_score || 92}</span>
                        </>
                      )}
                    </div>

                    {/* Duration Badge */}
                    <div className="absolute top-3 right-3 px-2 py-0.5 rounded bg-black/60 backdrop-blur-md text-[10px] font-mono text-slate-200">
                      {Math.round(clip.duration)}s
                    </div>

                    {/* Hover Play Button */}
                    <div className="absolute inset-0 m-auto w-12 h-12 rounded-full bg-indigo-600/90 text-white flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-opacity">
                      <Play className="w-5 h-5 ml-0.5" />
                    </div>

                    {/* Aspect Ratio Badge */}
                    <div className="absolute bottom-3 left-3 px-2 py-0.5 rounded bg-slate-900/80 text-[10px] text-slate-300 font-mono">
                      {clip.aspect_ratio || '9:16'}
                    </div>

                    {/* Status Pill */}
                    <div className="absolute bottom-3 right-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        clip.status === 'published' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                        clip.status === 'scheduled' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' :
                        'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      }`}>
                        {clip.status}
                      </span>
                    </div>
                  </div>

                  {/* Card Content */}
                  <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                    <div>
                      <h3 className="text-xs font-bold text-white line-clamp-2 leading-relaxed">
                        {clip.title}
                      </h3>
                      <p className="text-[11px] text-slate-400 mt-1 line-clamp-1">
                        Source: {clip.video_title || 'Video'}
                      </p>
                    </div>

                    {/* Bottom Actions */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenExportModal(clip.id);
                        }}
                        className="text-xs text-slate-400 hover:text-indigo-400 flex items-center gap-1 transition-colors"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Export</span>
                      </button>

                      <button
                        onClick={(e) => handleDeleteClip(clip.id, e)}
                        className="text-xs text-slate-500 hover:text-rose-400 p-1 transition-colors"
                        title="Delete Clip"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-12 text-center border border-dashed border-slate-800 rounded-2xl text-slate-500 text-sm">
            No clips found. Import videos to let the AI generate clips.
          </div>
        )
      ) : (
        /* Source Videos List */
        filteredVideos.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredVideos.map((video) => (
              <div
                key={video.id}
                className="p-5 rounded-2xl bg-[#12141d]/90 border border-slate-800/80 space-y-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                      {video.platform}
                    </span>
                    <h3 className="text-sm font-bold text-white line-clamp-2">
                      {video.title}
                    </h3>
                  </div>
                  <button
                    onClick={(e) => handleDeleteVideo(video.id, e)}
                    className="text-slate-500 hover:text-rose-400 p-1"
                    title="Delete Video"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-2 text-[11px] text-slate-400 font-mono py-2 border-y border-slate-800/60">
                  <div>
                    <span className="text-slate-500 block">Duration</span>
                    <span>{Math.round(video.duration)}s</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Resolution</span>
                    <span>{video.resolution || '1080p'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Clips</span>
                    <span className="text-indigo-400 font-bold">{video.clips_count || 0}</span>
                  </div>
                </div>

                <div className="flex justify-between items-center text-xs text-slate-500">
                  <span>Imported: {new Date(video.created_at).toLocaleDateString()}</span>
                  <span className="capitalize text-emerald-400">{video.status}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-12 text-center border border-dashed border-slate-800 rounded-2xl text-slate-500 text-sm">
            No source videos imported yet.
          </div>
        )
      )}
    </div>
  );
};
