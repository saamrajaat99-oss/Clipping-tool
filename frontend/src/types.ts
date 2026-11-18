export interface Video {
  id: string;
  title: string;
  source_url: string;
  platform: 'youtube' | 'gdrive' | 'dropbox' | 'twitch' | 'direct' | 'local';
  duration: number;
  resolution: string;
  fps: number;
  file_path?: string;
  thumbnail_path?: string;
  status: 'pending' | 'imported' | 'analyzing' | 'ready' | 'error';
  created_at: string;
  clips_count?: number;
}

export interface Clip {
  id: string;
  video_id: string;
  video_title?: string;
  source_platform?: string;
  source_url?: string;
  title: string;
  description: string;
  hashtags: string;
  start_time: number;
  end_time: number;
  duration: number;
  aspect_ratio: '9:16' | '16:9' | '1:1';
  virality_score: number;
  hook_score: number;
  caption_style: 'hormozi_yellow' | 'cyber_neon' | 'clean_minimal' | 'beast_bold';
  video_path?: string;
  thumbnail_path?: string;
  subtitle_path?: string;
  status: 'generated' | 'ready' | 'scheduled' | 'published' | 'failed';
  scheduled_at?: string;
  published_at?: string;
  created_at: string;
}

export interface Task {
  id: string;
  video_id: string;
  video_title?: string;
  task_type: string;
  status: 'pending' | 'downloading' | 'processing' | 'analyzing' | 'generating' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  status_message?: string;
  error_message?: string;
  created_at: string;
  updated_at: string;
}

export interface SocialAccount {
  id: string;
  platform: 'youtube' | 'instagram' | 'tiktok' | 'facebook' | 'linkedin';
  account_name: string;
  account_handle?: string;
  avatar_url?: string;
  client_id?: string;
  is_connected: boolean;
  has_access_token?: boolean;
  has_client_secret?: boolean;
  updated_at: string;
}

export interface OverviewMetrics {
  total_videos: number;
  total_clips: number;
  currently_processing: number;
  ready_to_publish: number;
  scheduled_posts: number;
  published_success: number;
  published_failed: number;
  success_rate: number;
}

export interface AnalyticsData {
  metrics: OverviewMetrics;
  source_distribution: { platform: string; count: number }[];
  platform_distribution: { platform: string; count: number }[];
  recent_tasks: Task[];
  storage: {
    original_videos_mb: number;
    processed_videos_mb: number;
    generated_clips_mb: number;
    thumbnails_mb: number;
    subtitles_mb: number;
    exports_mb: number;
    logs_mb: number;
    total_app_storage_mb: number;
    total_disk_gb: number;
    used_disk_gb: number;
    free_disk_gb: number;
    percent_used: number;
  };
}

export interface HardwareInfo {
  has_nvidia_gpu: boolean;
  gpu_name: string;
  gpu_memory_total_mb: number;
  nvenc_supported: boolean;
  ffmpeg_path: string;
  ffprobe_path: string;
}

export interface AppSettings {
  nvenc_enabled: boolean;
  gpu_device: string;
  whisper_model: string;
  default_aspect_ratio: string;
  caption_style: string;
  auto_cleanup_raw: boolean;
  max_concurrent_tasks: number;
  gemini_api_key?: string;
  openai_api_key?: string;
  hardware: HardwareInfo;
  storage: AnalyticsData['storage'];
}

export interface VideoImportRequest {
  urls: string[];
  clip_durations: number[];
  num_clips_per_video: number;
  aspect_ratio: '9:16' | '16:9' | '1:1';
  caption_style: string;
  target_platforms: string[];
  auto_publish: boolean;
  schedule_start_time?: string;
  schedule_interval_hours?: number;
  create_compilation?: boolean;
  transition_type?: string;
  transition_duration?: number;
}

export interface CreateCompilationRequest {
  clip_ids: string[];
  transition_type?: string;
  transition_duration?: number;
  aspect_ratio?: '9:16' | '16:9' | '1:1';
  caption_style?: string;
  title?: string;
  description?: string;
  hashtags?: string;
}
