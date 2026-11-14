import { Video, Clip, Task, SocialAccount, AnalyticsData, AppSettings } from '../types';

const API_BASE = '/api';

export const api = {
  // Videos
  async getVideos(): Promise<Video[]> {
    const res = await fetch(`${API_BASE}/videos`);
    return res.json();
  },

  async getVideo(id: string): Promise<Video & { clips: Clip[] }> {
    const res = await fetch(`${API_BASE}/videos/${id}`);
    return res.json();
  },

  async importVideos(payload: {
    urls: string[];
    clip_durations: number[];
    num_clips_per_video: number;
    aspect_ratio: string;
    caption_style: string;
    target_platforms: string[];
    auto_publish: boolean;
  }) {
    const res = await fetch(`${API_BASE}/videos/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return res.json();
  },

  async uploadVideo(formData: FormData) {
    const res = await fetch(`${API_BASE}/videos/upload`, {
      method: 'POST',
      body: formData
    });
    return res.json();
  },

  async deleteVideo(id: string) {
    const res = await fetch(`${API_BASE}/videos/${id}`, { method: 'DELETE' });
    return res.json();
  },

  // Clips
  async getClips(params?: { video_id?: string; status?: string }): Promise<Clip[]> {
    const query = new URLSearchParams();
    if (params?.video_id) query.append('video_id', params.video_id);
    if (params?.status) query.append('status', params.status);
    const res = await fetch(`${API_BASE}/clips?${query.toString()}`);
    return res.json();
  },

  async getClip(id: string): Promise<Clip> {
    const res = await fetch(`${API_BASE}/clips/${id}`);
    return res.json();
  },

  async updateClip(id: string, updates: Partial<Clip>) {
    const res = await fetch(`${API_BASE}/clips/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    return res.json();
  },

  async rerenderClip(id: string) {
    const res = await fetch(`${API_BASE}/clips/${id}/re-render`, { method: 'POST' });
    return res.json();
  },

  async scheduleClip(id: string, scheduled_at: string, platforms: string[]) {
    const res = await fetch(`${API_BASE}/clips/${id}/schedule`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clip_id: id, scheduled_at, platforms })
    });
    return res.json();
  },

  async publishClip(id: string, platforms: string[]) {
    const res = await fetch(`${API_BASE}/clips/${id}/publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clip_id: id, platforms })
    });
    return res.json();
  },

  async getExportPackage(id: string) {
    const res = await fetch(`${API_BASE}/clips/${id}/export-package`);
    return res.json();
  },

  async deleteClip(id: string) {
    const res = await fetch(`${API_BASE}/clips/${id}`, { method: 'DELETE' });
    return res.json();
  },

  // Queue
  async getQueue(): Promise<{ is_paused: boolean; is_running: boolean; tasks: Task[] }> {
    const res = await fetch(`${API_BASE}/queue`);
    return res.json();
  },

  async pauseQueue() {
    const res = await fetch(`${API_BASE}/queue/pause`, { method: 'POST' });
    return res.json();
  },

  async resumeQueue() {
    const res = await fetch(`${API_BASE}/queue/resume`, { method: 'POST' });
    return res.json();
  },

  async retryTask(taskId: string) {
    const res = await fetch(`${API_BASE}/queue/${taskId}/retry`, { method: 'POST' });
    return res.json();
  },

  async cancelTask(taskId: string) {
    const res = await fetch(`${API_BASE}/queue/${taskId}/cancel`, { method: 'POST' });
    return res.json();
  },

  async clearCompletedQueue() {
    const res = await fetch(`${API_BASE}/queue/clear-completed`, { method: 'DELETE' });
    return res.json();
  },

  // Social
  async getSocialAccounts(): Promise<SocialAccount[]> {
    const res = await fetch(`${API_BASE}/social/accounts`);
    return res.json();
  },

  async updateSocialAccount(platform: string, payload: any) {
    const res = await fetch(`${API_BASE}/social/accounts/${platform}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return res.json();
  },

  async disconnectSocialAccount(platform: string) {
    const res = await fetch(`${API_BASE}/social/accounts/${platform}/disconnect`, { method: 'POST' });
    return res.json();
  },

  async getPublishingHistory(): Promise<any[]> {
    const res = await fetch(`${API_BASE}/social/history`);
    return res.json();
  },

  // Analytics
  async getAnalytics(): Promise<AnalyticsData> {
    const res = await fetch(`${API_BASE}/analytics/overview`);
    return res.json();
  },

  // Settings
  async getSettings(): Promise<AppSettings> {
    const res = await fetch(`${API_BASE}/settings`);
    return res.json();
  },

  async updateSettings(settings: Partial<AppSettings>) {
    const res = await fetch(`${API_BASE}/settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings)
    });
    return res.json();
  }
};
