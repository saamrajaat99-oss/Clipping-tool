import React, { useState } from 'react';
import { 
  Link2, 
  Upload, 
  Sliders, 
  Film, 
  Layers, 
  Check, 
  Sparkles, 
  ArrowRight, 
  AlertCircle,
  FileVideo,
  Clock
} from 'lucide-react';
import { api } from '../services/api';

interface ImportStudioProps {
  onSuccess: () => void;
}

export const ImportStudio: React.FC<ImportStudioProps> = ({ onSuccess }) => {
  const [activeMode, setActiveMode] = useState<'url' | 'file'>('url');
  const [urlsText, setUrlsText] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Clipping Presets
  const [durations, setDurations] = useState<number[]>([30, 60]);
  const [numClips, setNumClips] = useState(4);
  const [aspectRatio, setAspectRatio] = useState<'9:16' | '16:9' | '1:1'>('9:16');
  const [captionStyle, setCaptionStyle] = useState<'hormozi_yellow' | 'cyber_neon' | 'clean_minimal' | 'beast_bold'>('hormozi_yellow');
  const [targetPlatforms, setTargetPlatforms] = useState<string[]>(['youtube', 'instagram', 'tiktok']);
  const [autoPublish, setAutoPublish] = useState(false);
  const [createCompilation, setCreateCompilation] = useState(true);
  const [transitionType, setTransitionType] = useState('fade');
  const [transitionDuration, setTransitionDuration] = useState(0.5);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successCount, setSuccessCount] = useState<number | null>(null);
  const [uploadProgress, setUploadProgress] = useState<{ percent: number; loadedMB: number; totalMB: number } | null>(null);

  const durationOptions = [15, 30, 45, 60, 90];
  const transitionOptions = [
    { id: 'fade', name: 'Crossfade', desc: 'Smooth cinematic dissolve' },
    { id: 'slideup', name: 'Slide Up', desc: 'Modern TikTok vertical upward transition' },
    { id: 'slidedown', name: 'Slide Down', desc: 'Slick downward transition' },
    { id: 'wipeleft', name: 'Wipe Left', desc: 'Dynamic horizontal wipe' },
    { id: 'wiperight', name: 'Wipe Right', desc: 'Reverse horizontal wipe' },
    { id: 'circleopen', name: 'Circle Iris', desc: 'Retro viral circle punch-in' },
    { id: 'fadeblack', name: 'Dip to Black', desc: 'Classic dramatic blackout' }
  ];
  const platformOptions = [
    { id: 'youtube', label: 'YouTube Shorts' },
    { id: 'instagram', label: 'Instagram Reels' },
    { id: 'tiktok', label: 'TikTok' },
    { id: 'facebook', label: 'Facebook Reels' },
    { id: 'linkedin', label: 'LinkedIn' }
  ];

  const captionStyleOptions = [
    { id: 'hormozi_yellow', name: 'Hormozi Yellow', desc: 'Vivid yellow word pop, high engagement bold uppercase' },
    { id: 'cyber_neon', name: 'Cyber Neon', desc: 'Futuristic cyan and magenta neon glow outline' },
    { id: 'clean_minimal', name: 'Clean Minimalist', desc: 'Modern white sans-serif with subtle pill background' },
    { id: 'beast_bold', name: 'Beast Bold', desc: 'Impact red & gold heavy viral typography' }
  ];

  const toggleDuration = (sec: number) => {
    if (durations.includes(sec)) {
      if (durations.length > 1) {
        setDurations(durations.filter(d => d !== sec));
      }
    } else {
      setDurations([...durations, sec]);
    }
  };

  const togglePlatform = (pId: string) => {
    if (targetPlatforms.includes(pId)) {
      setTargetPlatforms(targetPlatforms.filter(p => p !== pId));
    } else {
      setTargetPlatforms([...targetPlatforms, pId]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setIsLoading(true);
    setSuccessCount(null);

    try {
      if (activeMode === 'url') {
        const rawUrls = urlsText
          .split('\n')
          .map(u => u.trim())
          .filter(u => u.length > 0);

        if (rawUrls.length === 0) {
          setErrorMsg('Please paste at least one video URL.');
          setIsLoading(false);
          return;
        }

        const res = await api.importVideos({
          urls: rawUrls,
          clip_durations: durations,
          num_clips_per_video: numClips,
          aspect_ratio: aspectRatio,
          caption_style: captionStyle,
          target_platforms: targetPlatforms,
          auto_publish: autoPublish,
          create_compilation: createCompilation,
          transition_type: transitionType,
          transition_duration: transitionDuration
        });

        if (res.success) {
          setSuccessCount(res.queued_count);
          setUrlsText('');
          setTimeout(() => onSuccess(), 1200);
        } else {
          setErrorMsg(res.detail || 'Import failed.');
        }
      } else {
        if (!selectedFile) {
          setErrorMsg('Please select a video file.');
          setIsLoading(false);
          return;
        }

        const MAX_SIZE = 10 * 1024 * 1024 * 1024; // 10 GB
        if (selectedFile.size > MAX_SIZE) {
          setErrorMsg(`File size (${(selectedFile.size / (1024 * 1024 * 1024)).toFixed(2)} GB) exceeds the maximum allowed 10 GB limit.`);
          setIsLoading(false);
          return;
        }

        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('clip_durations', durations.join(','));
        formData.append('num_clips', numClips.toString());
        formData.append('aspect_ratio', aspectRatio);
        formData.append('caption_style', captionStyle);
        formData.append('create_compilation', createCompilation.toString());
        formData.append('transition_type', transitionType);
        formData.append('transition_duration', transitionDuration.toString());

        setUploadProgress({ percent: 0, loadedMB: 0, totalMB: Math.round(selectedFile.size / (1024 * 1024)) });

        const res = await api.uploadVideo(formData, (pct, loaded, total) => {
          setUploadProgress({ percent: pct, loadedMB: loaded, totalMB: total });
        });

        if (res.success) {
          setSuccessCount(1);
          setSelectedFile(null);
          setUploadProgress(null);
          setTimeout(() => onSuccess(), 1200);
        } else {
          setErrorMsg(res.detail || 'Upload failed.');
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
          <Film className="w-6 h-6 text-indigo-400" />
          <span>Import & Batch Queue Studio</span>
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Add video URLs or local files. Set your target clip lengths, aspect ratios, and subtitle styles, then queue them for local RTX 4060 GPU processing.
        </p>
      </div>

      {/* Mode Switcher */}
      <div className="flex border-b border-slate-800 gap-6">
        <button
          onClick={() => setActiveMode('url')}
          className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-all ${
            activeMode === 'url'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Link2 className="w-4 h-4" />
          <span>Paste Video URLs (YouTube, Drive, Dropbox, Twitch)</span>
        </button>
        <button
          onClick={() => setActiveMode('file')}
          className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-all ${
            activeMode === 'file'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Upload className="w-4 h-4" />
          <span>Upload Local Video File</span>
        </button>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successCount !== null && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm flex items-center gap-2.5">
          <Check className="w-4 h-4 shrink-0" />
          <span>Successfully queued {successCount} video(s) into the background pipeline! Redirecting...</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Input Area */}
        {activeMode === 'url' ? (
          <div className="p-6 rounded-2xl bg-[#12141d]/90 border border-slate-800/80 space-y-3">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              Paste Shareable Video Links (One URL per line)
            </label>
            <textarea
              rows={4}
              value={urlsText}
              onChange={(e) => setUrlsText(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=...&#10;https://drive.google.com/file/d/...&#10;https://www.twitch.tv/videos/..."
              className="w-full p-4 rounded-xl bg-slate-900/90 border border-slate-800 focus:border-indigo-500 text-sm text-slate-200 placeholder-slate-500 outline-none font-mono resize-none transition-colors"
            />
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
              <span className="font-semibold text-slate-300">Supported:</span>
              <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300">YouTube</span>
              <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300">Google Drive</span>
              <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300">Dropbox</span>
              <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300">Twitch</span>
              <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300">Direct MP4</span>
            </div>
          </div>
        ) : (
          <div className="p-8 rounded-2xl bg-[#12141d]/90 border-2 border-dashed border-slate-800 hover:border-indigo-500/50 transition-colors text-center">
            <input
              type="file"
              id="file-upload"
              accept="video/mp4,video/quicktime,video/x-matroska,video/webm"
              onChange={(e) => {
                const f = e.target.files?.[0] || null;
                if (f) {
                  const MAX_SIZE = 10 * 1024 * 1024 * 1024;
                  if (f.size > MAX_SIZE) {
                    setErrorMsg(`Selected file is ${(f.size / (1024 * 1024 * 1024)).toFixed(2)} GB, which exceeds the maximum allowed 10 GB limit.`);
                    setSelectedFile(null);
                    return;
                  }
                  setErrorMsg('');
                }
                setSelectedFile(f);
              }}
              className="hidden"
            />
            <label htmlFor="file-upload" className="cursor-pointer space-y-3 block">
              <div className="w-12 h-12 mx-auto rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                <FileVideo className="w-6 h-6" />
              </div>
              <div className="text-sm font-semibold text-slate-200">
                {selectedFile 
                  ? `${selectedFile.name} (${(selectedFile.size / (1024 * 1024 * 1024) >= 1 ? (selectedFile.size / (1024 * 1024 * 1024)).toFixed(2) + ' GB' : (selectedFile.size / (1024 * 1024)).toFixed(1) + ' MB')})` 
                  : 'Click or drag video file here (up to 10GB)'}
              </div>
              <div className="text-xs text-slate-500">
                MP4, MOV, MKV, or WEBM up to 10GB
              </div>
            </label>

            {uploadProgress && (
              <div className="mt-4 p-4 rounded-xl bg-indigo-950/60 border border-indigo-500/30 space-y-2 text-left">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-indigo-300 font-bold">Uploading large video: {uploadProgress.percent}%</span>
                  <span className="text-slate-400">{uploadProgress.loadedMB} MB / {uploadProgress.totalMB} MB</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 to-cyan-400 transition-all duration-150"
                    style={{ width: `${uploadProgress.percent}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* AI Clipping Presets Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Target Durations */}
          <div className="p-6 rounded-2xl bg-[#12141d]/90 border border-slate-800/80 space-y-4">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-400" />
              <label className="text-sm font-semibold text-white">Target Clip Durations</label>
            </div>
            <div className="flex flex-wrap gap-2.5">
              {durationOptions.map((sec) => {
                const isSelected = durations.includes(sec);
                return (
                  <button
                    key={sec}
                    type="button"
                    onClick={() => toggleDuration(sec)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold font-mono transition-all ${
                      isSelected
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                        : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {sec}s
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-slate-500">
              The AI will automatically slice clips matching these target lengths without cutting off sentences.
            </p>
          </div>

          {/* Number of Clips Slider */}
          <div className="p-6 rounded-2xl bg-[#12141d]/90 border border-slate-800/80 space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-white">Clips Per Video</label>
              <span className="text-sm font-mono font-bold text-indigo-400">{numClips} clips</span>
            </div>
            <input
              type="range"
              min={1}
              max={10}
              value={numClips}
              onChange={(e) => setNumClips(Number(e.target.value))}
              className="w-full cursor-pointer"
            />
            <div className="flex justify-between text-[11px] text-slate-500 font-mono">
              <span>1 (Top Highlight)</span>
              <span>5</span>
              <span>10 (Full Series)</span>
            </div>
          </div>

          {/* Aspect Ratio */}
          <div className="p-6 rounded-2xl bg-[#12141d]/90 border border-slate-800/80 space-y-4">
            <label className="text-sm font-semibold text-white">Aspect Ratio Reframing</label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { id: '9:16', label: '9:16 Vertical', sub: 'Shorts, Reels, TikTok' },
                { id: '16:9', label: '16:9 Landscape', sub: 'YouTube Standard' },
                { id: '1:1', label: '1:1 Square', sub: 'Instagram Feed' }
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setAspectRatio(opt.id as any)}
                  className={`p-3 rounded-xl text-left border transition-all ${
                    aspectRatio === opt.id
                      ? 'border-indigo-500 bg-indigo-500/10 text-white'
                      : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="text-xs font-bold">{opt.label}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">{opt.sub}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Subtitle Animation Style */}
          <div className="p-6 rounded-2xl bg-[#12141d]/90 border border-slate-800/80 space-y-4">
            <label className="text-sm font-semibold text-white">Animated Caption Style</label>
            <div className="grid grid-cols-2 gap-2.5">
              {captionStyleOptions.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setCaptionStyle(opt.id as any)}
                  className={`p-2.5 rounded-xl text-left border transition-all ${
                    captionStyle === opt.id
                      ? 'border-indigo-500 bg-indigo-500/10 text-white'
                      : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="text-xs font-bold">{opt.name}</div>
                  <div className="text-[10px] text-slate-500 line-clamp-1 mt-0.5">{opt.desc}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Multi-Clip Single Short Compilation Settings */}
        <div className="p-6 rounded-2xl bg-[#12141d]/90 border border-indigo-500/30 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <label className="text-sm font-bold text-white flex items-center gap-2">
                  <span>Auto-Stitch 4-5 Clips into Single Short Video</span>
                  <span className="px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/40 text-[10px] font-bold text-amber-300">
                    Enabled
                  </span>
                </label>
                <p className="text-xs text-slate-400 mt-0.5">
                  Automatically attaches 4 to 5 highlight clips with seamless video transitions and continuous synchronized captions into 1 short ready to upload.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setCreateCompilation(!createCompilation)}
              className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors duration-200 ${
                createCompilation ? 'bg-indigo-600 justify-end' : 'bg-slate-800 justify-start'
              }`}
            >
              <div className="w-4 h-4 rounded-full bg-white shadow-md transform transition-transform" />
            </button>
          </div>

          {createCompilation && (
            <div className="pt-3 border-t border-slate-800/80 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-2">Transition Effect Between Clips</label>
                <div className="grid grid-cols-2 gap-2">
                  {transitionOptions.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setTransitionType(t.id)}
                      className={`p-2.5 rounded-xl text-left border transition-all ${
                        transitionType === t.id
                          ? 'border-indigo-500 bg-indigo-500/15 text-white'
                          : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <div className="text-xs font-bold">{t.name}</div>
                      <div className="text-[10px] text-slate-500 line-clamp-1">{t.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-xs font-semibold text-slate-300 block">Transition Duration (Overlap)</label>
                <div className="flex gap-2">
                  {[0.3, 0.5, 0.8, 1.0].map((sec) => (
                    <button
                      key={sec}
                      type="button"
                      onClick={() => setTransitionDuration(sec)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
                        transitionDuration === sec
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {sec}s
                    </button>
                  ))}
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  The audio crossfades and video transitions seamlessly while speech subtitles continuously adjust and stay aligned across all merged clips.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Target Platforms Checkboxes */}
        <div className="p-6 rounded-2xl bg-[#12141d]/90 border border-slate-800/80 space-y-4">
          <label className="text-sm font-semibold text-white">Target Platforms for Publishing / Export</label>
          <div className="flex flex-wrap gap-3">
            {platformOptions.map((p) => {
              const isChecked = targetPlatforms.includes(p.id);
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => togglePlatform(p.id)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 border transition-all ${
                    isChecked
                      ? 'border-cyan-500/40 bg-cyan-500/10 text-cyan-300'
                      : 'border-slate-800 bg-slate-900 text-slate-400'
                  }`}
                >
                  <div className={`w-3.5 h-3.5 rounded flex items-center justify-center border ${isChecked ? 'bg-cyan-500 border-cyan-500' : 'border-slate-600'}`}>
                    {isChecked && <Check className="w-2.5 h-2.5 text-black" />}
                  </div>
                  <span>{p.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isLoading}
            className="px-8 py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-white font-bold text-sm shadow-xl shadow-indigo-500/25 flex items-center gap-2.5 transition-all disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4" />
            <span>{isLoading ? 'Queueing Tasks...' : 'Add Videos to Processing Queue'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
};
