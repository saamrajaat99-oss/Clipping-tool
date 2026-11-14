from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

class VideoImportRequest(BaseModel):
    urls: List[str] = Field(..., description="List of video URLs (YouTube, GDrive, Dropbox, Twitch, Direct MP4)")
    clip_durations: List[int] = Field(default=[30, 60], description="Target clip lengths in seconds (e.g. 15, 30, 45, 60, 90)")
    num_clips_per_video: int = Field(default=3, ge=1, le=20, description="Max clips to generate per video")
    aspect_ratio: str = Field(default="9:16", description="9:16, 16:9, or 1:1")
    caption_style: str = Field(default="hormozi_yellow", description="Subtitle animation style")
    target_platforms: List[str] = Field(default=["youtube", "instagram", "tiktok"], description="Platforms to publish or export for")
    auto_publish: bool = Field(default=False, description="Automatically schedule or publish clips when ready")
    schedule_start_time: Optional[str] = Field(default=None, description="ISO timestamp for first scheduled post")
    schedule_interval_hours: int = Field(default=4, ge=1, description="Interval between scheduled posts")

class ClipUpdateRequest(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    hashtags: Optional[str] = None
    start_time: Optional[float] = None
    end_time: Optional[float] = None
    aspect_ratio: Optional[str] = None
    caption_style: Optional[str] = None

class ClipScheduleRequest(BaseModel):
    clip_id: str
    scheduled_at: str  # ISO string
    platforms: List[str]  # ['youtube', 'instagram', 'tiktok', 'facebook', 'linkedin']

class ManualPublishRequest(BaseModel):
    clip_id: str
    platforms: List[str]

class SocialAccountUpdate(BaseModel):
    platform: str
    account_name: Optional[str] = None
    account_handle: Optional[str] = None
    client_id: Optional[str] = None
    client_secret: Optional[str] = None
    access_token: Optional[str] = None
    refresh_token: Optional[str] = None
    is_connected: Optional[bool] = None

class SettingsUpdate(BaseModel):
    nvenc_enabled: Optional[bool] = None
    gpu_device: Optional[str] = None
    whisper_model: Optional[str] = None
    default_aspect_ratio: Optional[str] = None
    caption_style: Optional[str] = None
    auto_cleanup_raw: Optional[bool] = None
    max_concurrent_tasks: Optional[int] = None
    gemini_api_key: Optional[str] = None
    openai_api_key: Optional[str] = None
