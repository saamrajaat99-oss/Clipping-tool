import React, { useState, useEffect, useRef } from 'react';
import { 
  Scissors, 
  Play, 
  Pause, 
  RotateCcw, 
  Sparkles, 
  Check, 
  Clock, 
  Send, 
  Download, 
  Sliders, 
  Layers, 
  RefreshCw,
  Hash,
  AlertCircle
} from 'lucide-react';
import { Clip } from '../types';
import { api } from '../services/api';

interface ClippingStudioProps {
  clip: Clip | null;
  onRefresh: () => void;
  onOpenExportModal: (clipId: string) => void;
}

export const ClippingStudio: React.FC<ClippingStudioProps> = ({
  clip,
  onRefresh,
  onOpenExportModal
}) => {
  const [currentClip, setCurrentClip] = useState<Clip | null>(clip);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(30);

  // Editable fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [hashtags, setHashtags] = useState('');
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(30);
  const [aspectRatio, setAspectRatio] = useState<'9:16' | '16:9' | '1:1'>('9:16');
  const [captionStyle, setCaptionStyle] = useState<'hormozi_yellow' | 'cyber_neon' | 'clean_minimal' | 'beast_bold'>('hormozi_yellow');

  const [isSaving, setIsSaving] = useState(false);
  const [isRendering, setIsRendering] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [showScheduleInput, setShowScheduleInput] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (clip) {
      setCurrentClip(clip);
      setTitle(clip.title || '');
      setDescription(clip.description || '');
      setHashtags(clip.hashtags || '');
      setStartTime(clip.start_time || 0);
      setEndTime(clip.end_time || 30);
      setDuration(clip.duration || 30);
      setAspectRatio(clip.aspect_ratio || '9:16');
      setCaptionStyle(clip.caption_style || 'hormozi_yellow');
    }
  }, [clip]);

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration || 30);
    }
  };

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleSeek = (time: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const handleSaveMetadata = async () => {
    if (!currentClip) return;
    setIsSaving(true);
    setStatusMsg('');
    try {
      await api.updateClip(currentClip.id, {
        title,
        description,
        hashtags,
        start_time: startTime,
        end_time: endTime,
        aspect_ratio: aspectRatio,
        caption_style: captionStyle
      });
      setStatusMsg('Clip metadata saved!');
      setTimeout(() => setStatusMsg(''), 3000);
      onRefresh();
    } catch (err: any) {
      setStatusMsg(`Save failed: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRerender = async () => {
    if (!currentClip) return;
    setIsRendering(true);
    setStatusMsg('Rendering clip with RTX 4060 NVENC acceleration...');
    try {
      await handleSaveMetadata();
      const res = await api.rerenderClip(currentClip.id);
      if (res.success) {
        setStatusMsg('Clip re-rendered successfully!');
        if (videoRef.current) {
          videoRef.current.load();
        }
        onRefresh();
      }
    } catch (err: any) {
      setStatusMsg(`Render failed: ${err.message}`);
    } finally {
      setIsRendering(false);
      setTimeout(() => setStatusMsg(''), 4000);
    }
  };

  const handleScheduleSubmit = async () => {
    if (!currentClip || !scheduleTime) return;
    try {
      await api.scheduleClip(currentClip.id, scheduleTime, ['youtube', 'instagram', 'tiktok']);
      setStatusMsg(`Clip scheduled for ${scheduleTime}!`);
      setShowScheduleInput(false);
      onRefresh();
    } catch (err: any) {
      setStatusMsg(`Schedule failed: ${err.message}`);
    }
  };

  if (!currentClip) {
    return (
      <div className="p-12 text-center max-w-xl mx-auto space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 text-indigo-400 mx-auto flex items-center justify-center">
          <Scissors className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-white">No Clip Selected</h2>
        <p className="text-sm text-slate-400">
          Select a clip from the Video Library or import new videos to start previewing and editing in the AI Clipping Studio.
        </p>
      </div>
    );
  }

  // Determine video URL
  const videoSrc = currentClip.video_path 
    ? `/storage/GeneratedClips/${currentClip.video_path.split(/[\\/]/).pop()}` 
    : '';

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Header bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-indigo-400 mb-1">
            <span>Video Source: {currentClip.video_title || 'Long Video'}</span>
            <span>•</span>
            <span className="capitalize">{currentClip.source_platform || 'Online Video'}</span>
          </div>
          <h1 className="text-xl md:text-2xl font-extrabold text-white tracking-tight">
            {title || 'Clip Editor'}
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-bold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Virality Score: {currentClip.virality_score || 92}/100</span>
          </div>

          <button
            onClick={() => onOpenExportModal(currentClip.id)}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-2 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Kit</span>
          </button>

          <button
            onClick={() => setShowScheduleInput(!showScheduleInput)}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-2 shadow-md shadow-indigo-600/30 transition-all"
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Schedule Post</span>
          </button>
        </div>
      </div>

      {statusMsg && (
        <div className="p-3.5 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{statusMsg}</span>
        </div>
      )}

      {/* Schedule Picker Bar */}
      {showScheduleInput && (
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-center gap-4">
          <label className="text-xs text-slate-300 font-semibold">Publish Date & Time:</label>
          <input
            type="datetime-local"
            value={scheduleTime}
            onChange={(e) => setScheduleTime(e.target.value)}
            className="p-2 rounded-lg bg-slate-800 border border-slate-700 text-xs text-white outline-none"
          />
          <button
            onClick={handleScheduleSubmit}
            className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors"
          >
            Confirm Schedule
          </button>
        </div>
      )}

      {/* Studio Workspace Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Video Player Preview (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="relative mx-auto rounded-2xl bg-black border border-slate-800 overflow-hidden shadow-2xl flex items-center justify-center aspect-[9/16] max-h-[560px]">
            {videoSrc ? (
              <video
                ref={videoRef}
                src={videoSrc}
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onEnded={() => setIsPlaying(false)}
                className="w-full h-full object-contain"
                playsInline
              />
            ) : (
              <div className="text-xs text-slate-500 p-8 text-center">
                Clip video preview rendering...
              </div>
            )}

            {/* Overlay Play/Pause Button */}
            <button
              onClick={togglePlay}
              className="absolute inset-0 m-auto w-14 h-14 rounded-full bg-black/50 hover:bg-black/70 backdrop-blur-md text-white flex items-center justify-center transition-all opacity-0 hover:opacity-100"
            >
              {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-0.5" />}
            </button>
          </div>

          {/* Timeline & Scrubber Bar */}
          <div className="p-4 rounded-xl bg-[#12141d]/90 border border-slate-800/80 space-y-3">
            <div className="flex items-center justify-between text-xs font-mono text-slate-400">
              <span>{currentTime.toFixed(1)}s</span>
              <button onClick={togglePlay} className="text-white hover:text-indigo-400">
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </button>
              <span>{duration.toFixed(1)}s</span>
            </div>

            <input
              type="range"
              min={0}
              max={duration || 30}
              step={0.1}
              value={currentTime}
              onChange={(e) => handleSeek(Number(e.target.value))}
              className="w-full cursor-pointer"
            />
          </div>
        </div>

        {/* Right: Controls & Fine-Tuning Panel (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Start and End Timestamps Fine-Tuner */}
          <div className="p-6 rounded-2xl bg-[#12141d]/90 border border-slate-800/80 space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-indigo-400" />
                <span>Trim & Timestamp Boundaries</span>
              </label>
              <span className="text-xs font-mono text-indigo-400 font-bold">
                Length: {(endTime - startTime).toFixed(1)}s
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Start Time (seconds)</label>
                <input
                  type="number"
                  step="0.1"
                  value={startTime}
                  onChange={(e) => setStartTime(Number(e.target.value))}
                  className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-sm font-mono text-white outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1">End Time (seconds)</label>
                <input
                  type="number"
                  step="0.1"
                  value={endTime}
                  onChange={(e) => setEndTime(Number(e.target.value))}
                  className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-sm font-mono text-white outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* AI Metadata Form (Title, Description, Hashtags) */}
          <div className="p-6 rounded-2xl bg-[#12141d]/90 border border-slate-800/80 space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                AI Hook Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Catchy viral hook title..."
                className="w-full p-3 rounded-xl bg-slate-900 border border-slate-800 text-sm text-white outline-none focus:border-indigo-500 font-medium"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                Social Media Caption / Description
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Platform description..."
                className="w-full p-3 rounded-xl bg-slate-900 border border-slate-800 text-sm text-slate-200 outline-none focus:border-indigo-500 resize-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1">
                <Hash className="w-3.5 h-3.5 text-cyan-400" />
                <span>Trending Hashtags</span>
              </label>
              <input
                type="text"
                value={hashtags}
                onChange={(e) => setHashtags(e.target.value)}
                placeholder="#Shorts #Viral #Reels #TikTok"
                className="w-full p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono text-cyan-300 outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          {/* Subtitle & Aspect Ratio Selectors */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-[#12141d]/90 border border-slate-800/80 space-y-2">
              <label className="text-xs font-semibold text-slate-300">Aspect Ratio</label>
              <select
                value={aspectRatio}
                onChange={(e) => setAspectRatio(e.target.value as any)}
                className="w-full p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-white outline-none"
              >
                <option value="9:16">9:16 Vertical (Shorts/Reels)</option>
                <option value="16:9">16:9 Landscape</option>
                <option value="1:1">1:1 Square</option>
              </select>
            </div>

            <div className="p-4 rounded-xl bg-[#12141d]/90 border border-slate-800/80 space-y-2">
              <label className="text-xs font-semibold text-slate-300">Caption Style</label>
              <select
                value={captionStyle}
                onChange={(e) => setCaptionStyle(e.target.value as any)}
                className="w-full p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-white outline-none"
              >
                <option value="hormozi_yellow">Hormozi Yellow Pop</option>
                <option value="cyber_neon">Cyber Neon Glow</option>
                <option value="clean_minimal">Clean Minimalist</option>
                <option value="beast_bold">Beast Bold Impact</option>
              </select>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-2">
            <button
              onClick={handleSaveMetadata}
              disabled={isSaving}
              className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors"
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>

            <button
              onClick={handleRerender}
              disabled={isRendering}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-white text-xs font-bold shadow-lg shadow-indigo-500/25 flex items-center gap-2 transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRendering ? 'animate-spin' : ''}`} />
              <span>{isRendering ? 'Rendering with RTX 4060...' : 'Re-Render Clip (NVENC GPU)'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
