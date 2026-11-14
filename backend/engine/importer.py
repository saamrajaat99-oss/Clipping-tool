import os
import re
import uuid
import shutil
import logging
import subprocess
from urllib.parse import urlparse
from pathlib import Path
import yt_dlp

from backend.config import ORIGINAL_VIDEOS_DIR, THUMBNAILS_DIR
from backend.utils.hardware import get_hardware_info

logger = logging.getLogger("importer")

def detect_platform(url: str) -> str:
    """Detects the video source platform from URL."""
    if not url:
        return "local"
    url_lower = url.lower()
    if "youtube.com" in url_lower or "youtu.be" in url_lower:
        return "youtube"
    elif "drive.google.com" in url_lower:
        return "gdrive"
    elif "dropbox.com" in url_lower:
        return "dropbox"
    elif "twitch.tv" in url_lower:
        return "twitch"
    elif url_lower.endswith((".mp4", ".mov", ".mkv", ".webm", ".avi", ".m4v")):
        return "direct"
    elif url_lower.startswith(("http://", "https://")):
        return "generic_web"
    else:
        return "local"

def extract_video_metadata(url_or_path: str):
    """
    Extracts title, duration, resolution, fps, and thumbnail for a video URL or local file.
    """
    platform = detect_platform(url_or_path)

    # If it's a local file, probe using ffprobe
    if platform == "local" or os.path.exists(url_or_path):
        return probe_local_file(url_or_path)

    # Use yt-dlp for online video platforms
    ydl_opts = {
        'quiet': True,
        'no_warnings': True,
        'extract_flat': 'in_playlist',
        'skip_download': True
    }

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url_or_path, download=False)
            if info:
                title = info.get('title', 'Untitled Video')
                duration = float(info.get('duration') or 0)
                width = info.get('width')
                height = info.get('height')
                resolution = f"{width}x{height}" if width and height else "1080p"
                fps = float(info.get('fps') or 30.0)
                thumbnail = info.get('thumbnail', '')
                
                return {
                    "title": title,
                    "platform": platform,
                    "duration": duration,
                    "resolution": resolution,
                    "fps": fps,
                    "thumbnail_url": thumbnail,
                    "description": info.get('description', '')[:500] if info.get('description') else '',
                    "channel": info.get('uploader') or info.get('channel') or ''
                }
    except Exception as e:
        logger.warning(f"yt-dlp extract_info failed: {e}. Falling back to default metadata.")
        
    return {
        "title": f"Video from {platform.capitalize()}",
        "platform": platform,
        "duration": 0,
        "resolution": "1920x1080",
        "fps": 30.0,
        "thumbnail_url": "",
        "description": "",
        "channel": ""
    }

def probe_local_file(file_path: str):
    """Probes a local video file using ffprobe."""
    hw = get_hardware_info()
    ffprobe_cmd = hw["ffprobe_path"]
    
    metadata = {
        "title": Path(file_path).stem,
        "platform": "local",
        "duration": 0,
        "resolution": "1920x1080",
        "fps": 30.0,
        "thumbnail_url": "",
        "description": "Locally uploaded video",
        "channel": "Local"
    }
    
    try:
        cmd = [
            ffprobe_cmd,
            "-v", "error",
            "-show_entries", "format=duration:stream=width,height,r_frame_rate",
            "-of", "default=noprint_wrappers=1",
            file_path
        ]
        res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, timeout=10)
        if res.returncode == 0:
            lines = res.stdout.strip().split("\n")
            w, h = 1920, 1080
            for line in lines:
                if line.startswith("duration="):
                    try:
                        metadata["duration"] = float(line.split("=")[1])
                    except ValueError:
                        pass
                elif line.startswith("width="):
                    try:
                        w = int(line.split("=")[1])
                    except ValueError:
                        pass
                elif line.startswith("height="):
                    try:
                        h = int(line.split("=")[1])
                    except ValueError:
                        pass
                elif line.startswith("r_frame_rate="):
                    try:
                        fr = line.split("=")[1].strip()
                        if "/" in fr:
                            num, den = fr.split("/")
                            metadata["fps"] = round(float(num) / float(den), 2)
                        else:
                            metadata["fps"] = round(float(fr), 2)
                    except Exception:
                        pass
            metadata["resolution"] = f"{w}x{h}"
    except Exception as e:
        logger.warning(f"ffprobe failed on {file_path}: {e}")

    return metadata

def download_video(url: str, video_id: str, progress_callback=None) -> dict:
    """
    Downloads an online video to storage/OriginalVideos/<video_id>.<ext>
    Reports progress via progress_callback(percent, speed_str, eta_str).
    """
    platform = detect_platform(url)
    output_template = str(ORIGINAL_VIDEOS_DIR / f"{video_id}.%(ext)s")

    def yt_progress_hook(d):
        if d['status'] == 'downloading':
            total = d.get('total_bytes') or d.get('total_bytes_estimate') or 0
            downloaded = d.get('downloaded_bytes', 0)
            percent = (downloaded / total * 100) if total > 0 else 0
            speed = d.get('speed') or 0
            eta = d.get('eta') or 0
            
            speed_str = f"{round(speed / (1024 * 1024), 2)} MB/s" if speed else "Calculating..."
            eta_str = f"{eta}s" if eta else "..."
            
            if progress_callback:
                progress_callback(percent, speed_str, eta_str)
        elif d['status'] == 'finished':
            if progress_callback:
                progress_callback(100.0, "Complete", "0s")

    ydl_opts = {
        'format': 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
        'outtmpl': output_template,
        'progress_hooks': [yt_progress_hook],
        'quiet': True,
        'no_warnings': True,
        'merge_output_format': 'mp4'
    }

    # Handle Dropbox direct download conversion
    if "dropbox.com" in url:
        if "dl=0" in url:
            url = url.replace("dl=0", "dl=1")
        elif "?dl=" not in url:
            url = url + ("?dl=1" if "?" not in url else "&dl=1")

    # Handle Google Drive direct link conversion
    if "drive.google.com" in url:
        match = re.search(r'/d/([a-zA-Z0-9_-]+)', url)
        if match:
            file_id = match.group(1)
            url = f"https://drive.google.com/uc?export=download&id={file_id}"

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=True)
            # Find the actual downloaded file
            final_filename = ydl.prepare_filename(info)
            # Ensure mp4 if merged
            base, _ = os.path.splitext(final_filename)
            mp4_file = base + ".mp4"
            if os.path.exists(mp4_file):
                downloaded_path = mp4_file
            elif os.path.exists(final_filename):
                downloaded_path = final_filename
            else:
                # search in directory
                matches = list(ORIGINAL_VIDEOS_DIR.glob(f"{video_id}.*"))
                downloaded_path = str(matches[0]) if matches else ""

            # Generate thumbnail if not exists
            thumb_path = generate_video_thumbnail(downloaded_path, video_id)

            return {
                "success": True,
                "file_path": downloaded_path,
                "thumbnail_path": thumb_path,
                "title": info.get('title', 'Imported Video'),
                "duration": float(info.get('duration') or 0),
                "resolution": f"{info.get('width', 1920)}x{info.get('height', 1080)}",
                "fps": float(info.get('fps') or 30.0)
            }
    except Exception as e:
        logger.error(f"Download failed for {url}: {e}")
        return {
            "success": False,
            "error": str(e)
        }

def generate_video_thumbnail(video_path: str, video_id: str, timestamp_sec: float = 2.0) -> str:
    """Generates a high-quality JPG thumbnail at timestamp_sec."""
    hw = get_hardware_info()
    ffmpeg_cmd = hw["ffmpeg_path"]
    thumb_path = str(THUMBNAILS_DIR / f"{video_id}.jpg")

    if not video_path or not os.path.exists(video_path):
        return ""

    try:
        cmd = [
            ffmpeg_cmd,
            "-y",
            "-ss", str(timestamp_sec),
            "-i", video_path,
            "-vframes", "1",
            "-q:v", "2",
            thumb_path
        ]
        res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=10)
        if res.returncode == 0 and os.path.exists(thumb_path):
            return thumb_path
    except Exception as e:
        logger.warning(f"Thumbnail generation failed: {e}")

    return ""
