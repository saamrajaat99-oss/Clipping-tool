import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { Overview } from './components/Overview';
import { ImportStudio } from './components/ImportStudio';
import { ClippingStudio } from './components/ClippingStudio';
import { VideoLibrary } from './components/VideoLibrary';
import { ProcessingQueue } from './components/ProcessingQueue';
import { PublishingCalendar } from './components/PublishingCalendar';
import { ConnectedPlatforms } from './components/ConnectedPlatforms';
import { AnalyticsDashboard } from './components/AnalyticsDashboard';
import { SettingsStudio } from './components/SettingsStudio';
import { ExportModal } from './components/ExportModal';

import { api } from './services/api';
import { Video, Clip, Task, SocialAccount, AnalyticsData, AppSettings } from './types';

export const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<string>('overview');
  
  // Data States
  const [videos, setVideos] = useState<Video[]>([]);
  const [clips, setClips] = useState<Clip[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isQueuePaused, setIsQueuePaused] = useState(false);
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [settings, setSettings] = useState<AppSettings | null>(null);

  // Selected Clip for Studio
  const [selectedClip, setSelectedClip] = useState<Clip | null>(null);

  // Export Kit Modal
  const [exportClipId, setExportClipId] = useState<string | null>(null);

  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadAllData = async () => {
    setIsRefreshing(true);
    try {
      const [vData, cData, qData, aData, sData, setts] = await Promise.all([
        api.getVideos().catch(() => []),
        api.getClips().catch(() => []),
        api.getQueue().catch(() => ({ is_paused: false, is_running: true, tasks: [] })),
        api.getSocialAccounts().catch(() => []),
        api.getAnalytics().catch(() => null),
        api.getSettings().catch(() => null)
      ]);

      setVideos(vData);
      setClips(cData);
      setTasks(qData.tasks || []);
      setIsQueuePaused(qData.is_paused || false);
      setAccounts(aData);
      setAnalytics(sData);
      setSettings(setts);

      // Auto-select first clip for studio if none selected
      if (!selectedClip && cData.length > 0) {
        setSelectedClip(cData[0]);
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadAllData();

    // Setup WebSocket for real-time task updates
    let ws: WebSocket;
    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/api/ws`;
      ws = new WebSocket(wsUrl);

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.event === 'task_update') {
            loadAllData();
          }
        } catch (e) {
          console.error('WebSocket parse error:', e);
        }
      };

      // Periodic ping
      const pingInterval = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send('ping');
        }
      }, 15000);

      return () => {
        clearInterval(pingInterval);
        ws.close();
      };
    } catch (e) {
      console.warn('WebSocket init warning:', e);
    }
  }, []);

  const handleSelectClip = (clip: Clip) => {
    setSelectedClip(clip);
    setCurrentTab('studio');
  };

  const activeTasksCount = tasks.filter(t => 
    ['pending', 'downloading', 'analyzing', 'generating', 'processing'].includes(t.status)
  ).length;

  return (
    <div className="flex min-h-screen bg-[#090A0F] text-slate-100 font-sans">
      {/* Left Sidebar */}
      <Sidebar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        activeTasksCount={activeTasksCount}
        hardware={settings?.hardware}
      />

      {/* Main Body */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header
          onQuickImport={() => setCurrentTab('import')}
          onRefresh={loadAllData}
          isRefreshing={isRefreshing}
          storageFreeGb={analytics?.storage?.free_disk_gb}
        />

        <main className="flex-1 pb-16">
          {currentTab === 'overview' && (
            <Overview analytics={analytics} onNavigate={setCurrentTab} />
          )}

          {currentTab === 'import' && (
            <ImportStudio
              onSuccess={() => {
                loadAllData();
                setCurrentTab('queue');
              }}
            />
          )}

          {currentTab === 'studio' && (
            <ClippingStudio
              clip={selectedClip}
              onRefresh={loadAllData}
              onOpenExportModal={(id) => setExportClipId(id)}
            />
          )}

          {currentTab === 'library' && (
            <VideoLibrary
              clips={clips}
              videos={videos}
              onSelectClip={handleSelectClip}
              onRefresh={loadAllData}
              onOpenExportModal={(id) => setExportClipId(id)}
            />
          )}

          {currentTab === 'queue' && (
            <ProcessingQueue
              tasks={tasks}
              isPaused={isQueuePaused}
              onRefresh={loadAllData}
            />
          )}

          {currentTab === 'calendar' && (
            <PublishingCalendar
              clips={clips}
              onRefresh={loadAllData}
              onOpenExportModal={(id) => setExportClipId(id)}
            />
          )}

          {currentTab === 'platforms' && (
            <ConnectedPlatforms
              accounts={accounts}
              onRefresh={loadAllData}
            />
          )}

          {currentTab === 'analytics' && (
            <AnalyticsDashboard analytics={analytics} />
          )}

          {currentTab === 'settings' && (
            <SettingsStudio />
          )}
        </main>
      </div>

      {/* Export Assistant Modal */}
      {exportClipId && (
        <ExportModal
          clipId={exportClipId}
          onClose={() => setExportClipId(null)}
        />
      )}
    </div>
  );
};
export default App;
