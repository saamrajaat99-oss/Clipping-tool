import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Cpu, 
  HardDrive, 
  Sparkles, 
  Save, 
  Check, 
  Zap,
  Folder,
  ShieldAlert
} from 'lucide-react';
import { AppSettings } from '../types';
import { api } from '../services/api';

export const SettingsStudio: React.FC = () => {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [nvencEnabled, setNvencEnabled] = useState(true);
  const [whisperModel, setWhisperModel] = useState('base');
  const [defaultAspect, setDefaultAspect] = useState('9:16');
  const [captionStyle, setCaptionStyle] = useState('hormozi_yellow');
  const [autoCleanup, setAutoCleanup] = useState(false);
  const [maxTasks, setMaxTasks] = useState(2);
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [openaiApiKey, setOpenaiApiKey] = useState('');

  const [isSaving, setIsSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  useEffect(() => {
    api.getSettings().then((data) => {
      setSettings(data);
      setNvencEnabled(data.nvenc_enabled);
      setWhisperModel(data.whisper_model);
      setDefaultAspect(data.default_aspect_ratio);
      setCaptionStyle(data.caption_style);
      setAutoCleanup(data.auto_cleanup_raw);
      setMaxTasks(data.max_concurrent_tasks);
      setGeminiApiKey(data.gemini_api_key || '');
      setOpenaiApiKey(data.openai_api_key || '');
    }).catch(console.error);
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setStatusMsg('');

    try {
      await api.updateSettings({
        nvenc_enabled: nvencEnabled,
        whisper_model: whisperModel,
        default_aspect_ratio: defaultAspect,
        caption_style: captionStyle,
        auto_cleanup_raw: autoCleanup,
        max_concurrent_tasks: maxTasks,
        gemini_api_key: geminiApiKey,
        openai_api_key: openaiApiKey
      });
      setStatusMsg('Configuration saved successfully!');
      setTimeout(() => setStatusMsg(''), 3000);
    } catch (err: any) {
      setStatusMsg(`Save error: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const hw = settings?.hardware;

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
          <Settings className="w-6 h-6 text-indigo-400" />
          <span>System & Hardware Acceleration Settings</span>
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Configure local NVIDIA RTX 4060 GPU acceleration, AI speech transcription, storage locations, and API keys.
        </p>
      </div>

      {statusMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
          <Check className="w-4 h-4 shrink-0" />
          <span>{statusMsg}</span>
        </div>
      )}

      {/* Hardware Detected Box */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 to-[#12141d] border border-slate-800 space-y-4">
        <div className="flex items-center gap-2">
          <Cpu className="w-5 h-5 text-emerald-400" />
          <h2 className="text-sm font-bold text-white">Detected Laptop Hardware Environment</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
          <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1">
            <span className="text-slate-500 block">GPU Model</span>
            <span className="text-emerald-400 font-bold">{hw?.gpu_name || 'NVIDIA GeForce RTX 4060 Laptop'}</span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1">
            <span className="text-slate-500 block">VRAM & NVENC</span>
            <span className="text-white font-bold">
              {hw?.gpu_memory_total_mb ? `${hw.gpu_memory_total_mb} MB GDDR6` : '8GB GDDR6'} • {hw?.nvenc_supported ? 'NVENC Active' : 'CPU Fallback'}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1">
            <span className="text-slate-500 block">FFmpeg Engine</span>
            <span className="text-cyan-400 truncate block">Gyan 9.0.2 (libass + nvenc)</span>
          </div>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* GPU Acceleration Controls */}
        <div className="p-6 rounded-2xl bg-[#12141d]/90 border border-slate-800/80 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-400" />
                <span>NVIDIA NVENC Hardware Encoding</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Renders 1080x1920 clips using your RTX 4060 hardware encoder (up to 10x faster rendering speed).
              </p>
            </div>

            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={nvencEnabled}
                onChange={(e) => setNvencEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
          </div>
        </div>

        {/* AI & Transcription Settings */}
        <div className="p-6 rounded-2xl bg-[#12141d]/90 border border-slate-800/80 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            <span>AI Transcription & Model Configuration</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-slate-400 block mb-1">Whisper Speech Model Size</label>
              <select
                value={whisperModel}
                onChange={(e) => setWhisperModel(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white outline-none"
              >
                <option value="tiny">Tiny (Fastest, lowest memory)</option>
                <option value="base">Base (Recommended balance)</option>
                <option value="small">Small (Higher accuracy)</option>
                <option value="medium">Medium (Maximum precision)</option>
              </select>
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">Max Concurrent Processing Tasks</label>
              <select
                value={maxTasks}
                onChange={(e) => setMaxTasks(Number(e.target.value))}
                className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white outline-none"
              >
                <option value={1}>1 Task (Gentle on Laptop)</option>
                <option value={2}>2 Tasks (Balanced for i7 / RTX 4060)</option>
                <option value={4}>4 Tasks (Maximum throughput)</option>
              </select>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800 space-y-3">
            <div>
              <label className="text-xs text-slate-400 block mb-1">Gemini API Key (Optional for cloud LLM reasoning)</label>
              <input
                type="password"
                value={geminiApiKey}
                onChange={(e) => setGeminiApiKey(e.target.value)}
                placeholder="AIzaSy..."
                className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono text-white outline-none focus:border-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* Disk & Storage Management */}
        <div className="p-6 rounded-2xl bg-[#12141d]/90 border border-slate-800/80 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-cyan-400" />
            <span>Storage & File Retention Policies</span>
          </h3>

          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-300">Auto-delete raw original video after clipping</span>
              <p className="text-[11px] text-slate-500">
                Saves personal laptop disk space by removing the heavy source video once all short clips and subtitles are generated.
              </p>
            </div>

            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={autoCleanup}
                onChange={(e) => setAutoCleanup(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-400 font-mono space-y-1">
            <div className="flex items-center gap-2 text-slate-300 font-semibold mb-1">
              <Folder className="w-3.5 h-3.5 text-indigo-400" />
              <span>Configured Local Storage Directories</span>
            </div>
            <div>/VideoClipper/OriginalVideos/</div>
            <div>/VideoClipper/GeneratedClips/</div>
            <div>/VideoClipper/Thumbnails/</div>
            <div>/VideoClipper/Subtitles/</div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSaving}
            className="px-8 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Saving...' : 'Save Settings'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
