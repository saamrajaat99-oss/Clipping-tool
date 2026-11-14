import React, { useState } from 'react';
import { 
  Share2, 
  CheckCircle2, 
  XCircle, 
  Key, 
  ExternalLink, 
  Shield, 
  Save, 
  RefreshCw,
  AlertTriangle,
  HelpCircle
} from 'lucide-react';
import { SocialAccount } from '../types';
import { api } from '../services/api';

interface ConnectedPlatformsProps {
  accounts: SocialAccount[];
  onRefresh: () => void;
}

const capitalize = (s: string) => s ? s.charAt(0).toUpperCase() + s.slice(1) : '';

export const ConnectedPlatforms: React.FC<ConnectedPlatformsProps> = ({
  accounts,
  onRefresh
}) => {
  const [editingPlatform, setEditingPlatform] = useState<string | null>(null);
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [accountHandle, setAccountHandle] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState('');

  const platformGuides: Record<string, { title: string; devUrl: string; desc: string }> = {
    youtube: {
      title: 'YouTube Shorts (Google Cloud Console)',
      devUrl: 'https://console.cloud.google.com/apis/credentials',
      desc: 'Create an OAuth 2.0 Client ID with YouTube Data API v3 scope (upload & manage videos).'
    },
    instagram: {
      title: 'Instagram Reels (Meta for Developers)',
      devUrl: 'https://developers.facebook.com/',
      desc: 'Requires Meta App with instagram_content_publish and pages_show_list permissions.'
    },
    tiktok: {
      title: 'TikTok Content Posting API',
      devUrl: 'https://developers.tiktok.com/',
      desc: 'TikTok Developer App with video.upload and video.publish scopes.'
    },
    facebook: {
      title: 'Facebook Reels (Meta Graph API)',
      devUrl: 'https://developers.facebook.com/',
      desc: 'Meta Graph API with publish_video and pages_manage_posts.'
    },
    linkedin: {
      title: 'LinkedIn Posts API',
      devUrl: 'https://www.linkedin.com/developers/',
      desc: 'LinkedIn Developer App with w_member_social or w_organization_social permission.'
    }
  };

  const handleOpenConfig = (acc: SocialAccount) => {
    setEditingPlatform(acc.platform);
    setClientId(acc.client_id || '');
    setClientSecret('');
    setAccessToken('');
    setAccountHandle(acc.account_handle || '');
    setFeedbackMsg('');
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlatform) return;
    setIsSaving(true);
    setFeedbackMsg('');

    try {
      await api.updateSocialAccount(editingPlatform, {
        platform: editingPlatform,
        client_id: clientId,
        client_secret: clientSecret || undefined,
        access_token: accessToken || undefined,
        account_handle: accountHandle,
        is_connected: true
      });
      setFeedbackMsg('Credentials saved and account marked active!');
      setTimeout(() => {
        setEditingPlatform(null);
        onRefresh();
      }, 1200);
    } catch (err: any) {
      setFeedbackMsg(`Error: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDisconnect = async (platform: string) => {
    if (!window.confirm(`Disconnect ${capitalize(platform)}? API tokens will be removed.`)) return;
    try {
      await api.disconnectSocialAccount(platform);
      onRefresh();
    } catch (err: any) {
      alert(`Disconnect failed: ${err.message}`);
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
          <Share2 className="w-6 h-6 text-indigo-400" />
          <span>Connected Social Media Platforms</span>
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Connect your official developer API credentials for automated publishing. Tokens are securely encrypted locally using AES-256 (Fernet) on your laptop.
        </p>
      </div>

      {/* Grid of Platform Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {accounts.map((acc) => {
          const guide = platformGuides[acc.platform] || {
            title: acc.platform,
            devUrl: '#',
            desc: 'Official Platform Developer API'
          };

          return (
            <div
              key={acc.id}
              className="p-6 rounded-2xl bg-[#12141d]/90 border border-slate-800/80 hover:border-slate-700 flex flex-col justify-between space-y-5 transition-all shadow-md"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center font-bold text-sm text-white">
                      {acc.account_name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white">{acc.account_name}</h3>
                      <p className="text-[11px] text-slate-500 font-mono">
                        {acc.account_handle || 'Not configured'}
                      </p>
                    </div>
                  </div>

                  {acc.is_connected ? (
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Connected</span>
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700 flex items-center gap-1">
                      <XCircle className="w-3 h-3" />
                      <span>Offline</span>
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-400 leading-relaxed line-clamp-2">
                  {guide.desc}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-3 border-t border-slate-800/80">
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => handleOpenConfig(acc)}
                    className="px-3 py-1.5 rounded-lg bg-indigo-600/15 text-indigo-400 hover:bg-indigo-600 hover:text-white border border-indigo-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    <Key className="w-3 h-3" />
                    <span>Configure API</span>
                  </button>

                  {acc.is_connected ? (
                    <button
                      onClick={() => handleDisconnect(acc.platform)}
                      className="text-xs text-slate-500 hover:text-rose-400 transition-colors"
                    >
                      Disconnect
                    </button>
                  ) : (
                    <a
                      href={guide.devUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-slate-500 hover:text-slate-300 flex items-center gap-1"
                    >
                      <span>Dev Portal</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* API Configuration Modal */}
      {editingPlatform && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg p-6 rounded-2xl bg-[#12141d] border border-slate-800 shadow-2xl space-y-5 animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Shield className="w-4 h-4 text-indigo-400" />
                <span>Configure {capitalize(editingPlatform)} API Credentials</span>
              </h2>
              <button
                onClick={() => setEditingPlatform(null)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            {feedbackMsg && (
              <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs">
                {feedbackMsg}
              </div>
            )}

            <form onSubmit={handleSaveConfig} className="space-y-4">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Account Handle / Channel ID</label>
                <input
                  type="text"
                  value={accountHandle}
                  onChange={(e) => setAccountHandle(e.target.value)}
                  placeholder="@yourchannel or ID"
                  className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Client ID / App ID</label>
                <input
                  type="text"
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  placeholder="Official developer Client ID"
                  className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Client Secret (Encrypted locally)</label>
                <input
                  type="password"
                  value={clientSecret}
                  onChange={(e) => setClientSecret(e.target.value)}
                  placeholder="••••••••••••••••"
                  className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white outline-none focus:border-indigo-500 font-mono"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Access Token / Bearer Token</label>
                <textarea
                  rows={2}
                  value={accessToken}
                  onChange={(e) => setAccessToken(e.target.value)}
                  placeholder="Paste OAuth access token here..."
                  className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white outline-none focus:border-indigo-500 font-mono resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingPlatform(null)}
                  className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isSaving ? 'Encrypting...' : 'Save & Connect'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
