import React, { useState, useEffect } from 'react';
import { 
  Download, 
  Copy, 
  Check, 
  ExternalLink, 
  Sparkles, 
  FileVideo, 
  Image as ImageIcon,
  Share2,
  X
} from 'lucide-react';
import { api } from '../services/api';

interface ExportModalProps {
  clipId: string | null;
  onClose: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({ clipId, onClose }) => {
  const [pkg, setPkg] = useState<any>(null);
  const [copiedCaption, setCopiedCaption] = useState(false);
  const [copiedTitle, setCopiedTitle] = useState(false);

  useEffect(() => {
    if (clipId) {
      api.getExportPackage(clipId).then(setPkg).catch(console.error);
    }
  }, [clipId]);

  if (!clipId || !pkg) return null;

  const copyToClipboard = (text: string, type: 'caption' | 'title') => {
    navigator.clipboard.writeText(text);
    if (type === 'caption') {
      setCopiedCaption(true);
      setTimeout(() => setCopiedCaption(false), 2000);
    } else {
      setCopiedTitle(true);
      setTimeout(() => setCopiedTitle(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-xl p-6 rounded-2xl bg-[#12141d] border border-slate-800 shadow-2xl space-y-6 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-400" />
            <h2 className="text-base font-bold text-white">1-Click Manual Export Assistant</h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Media Downloads Row */}
        <div className="grid grid-cols-2 gap-3">
          <a
            href={pkg.download_url}
            download
            className="p-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 transition-colors"
          >
            <FileVideo className="w-4 h-4" />
            <span>Download High-Res MP4</span>
          </a>

          {pkg.thumbnail_url && (
            <a
              href={pkg.thumbnail_url}
              download
              className="p-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs flex items-center justify-center gap-2 border border-slate-700 transition-colors"
            >
              <ImageIcon className="w-4 h-4" />
              <span>Download Thumbnail</span>
            </a>
          )}
        </div>

        {/* Caption & Hashtag Box */}
        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-300">Ready-to-Post Platform Caption:</span>
            <button
              onClick={() => copyToClipboard(pkg.caption_full, 'caption')}
              className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors"
            >
              {copiedCaption ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedCaption ? 'Copied!' : 'Copy Caption & Hashtags'}</span>
            </button>
          </div>

          <div className="p-3 rounded-lg bg-slate-950 text-xs font-mono text-slate-300 max-h-36 overflow-y-auto whitespace-pre-wrap border border-slate-800/80">
            {pkg.caption_full}
          </div>
        </div>

        {/* Direct Platform Links */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-400 block">
            Directly Open Platform Creator Studios:
          </label>
          <div className="grid grid-cols-3 gap-2 text-xs">
            {pkg.platform_portals && Object.entries(pkg.platform_portals).map(([key, url]: [string, any]) => (
              <a
                key={key}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 flex items-center justify-between capitalize transition-colors"
              >
                <span>{key}</span>
                <ExternalLink className="w-3 h-3 text-slate-500" />
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
