import os
import shutil
from pathlib import Path
from backend.config import (
    STORAGE_DIR,
    ORIGINAL_VIDEOS_DIR,
    PROCESSED_VIDEOS_DIR,
    GENERATED_CLIPS_DIR,
    THUMBNAILS_DIR,
    SUBTITLES_DIR,
    EXPORTS_DIR,
    LOGS_DIR
)

def get_directory_size(path: Path) -> int:
    """Calculates total size in bytes for a directory."""
    total = 0
    if not path.exists():
        return 0
    for root, dirs, files in os.walk(path):
        for f in files:
            fp = os.path.join(root, f)
            try:
                total += os.path.getsize(fp)
            except OSError:
                pass
    return total

def get_storage_stats():
    """Returns storage usage breakdown in MB and disk total/free space."""
    usage = shutil.disk_usage(STORAGE_DIR)
    
    breakdown = {
        "original_videos_mb": round(get_directory_size(ORIGINAL_VIDEOS_DIR) / (1024 * 1024), 2),
        "processed_videos_mb": round(get_directory_size(PROCESSED_VIDEOS_DIR) / (1024 * 1024), 2),
        "generated_clips_mb": round(get_directory_size(GENERATED_CLIPS_DIR) / (1024 * 1024), 2),
        "thumbnails_mb": round(get_directory_size(THUMBNAILS_DIR) / (1024 * 1024), 2),
        "subtitles_mb": round(get_directory_size(SUBTITLES_DIR) / (1024 * 1024), 2),
        "exports_mb": round(get_directory_size(EXPORTS_DIR) / (1024 * 1024), 2),
        "logs_mb": round(get_directory_size(LOGS_DIR) / (1024 * 1024), 2),
        "total_disk_gb": round(usage.total / (1024 * 1024 * 1024), 2),
        "used_disk_gb": round(usage.used / (1024 * 1024 * 1024), 2),
        "free_disk_gb": round(usage.free / (1024 * 1024 * 1024), 2),
        "percent_used": round((usage.used / usage.total) * 100, 1)
    }
    
    breakdown["total_app_storage_mb"] = round(
        breakdown["original_videos_mb"] +
        breakdown["processed_videos_mb"] +
        breakdown["generated_clips_mb"] +
        breakdown["thumbnails_mb"] +
        breakdown["subtitles_mb"] +
        breakdown["exports_mb"] +
        breakdown["logs_mb"],
        2
    )
    return breakdown

def cleanup_raw_video(file_path: str):
    """Deletes raw video file if cleanup is enabled."""
    if file_path and os.path.exists(file_path):
        try:
            os.remove(file_path)
            return True
        except Exception:
            return False
    return False

def delete_clip_files(video_path: str = None, thumb_path: str = None, sub_path: str = None):
    """Deletes associated media files when a clip is deleted."""
    for p in [video_path, thumb_path, sub_path]:
        if p and os.path.exists(p):
            try:
                os.remove(p)
            except Exception:
                pass
