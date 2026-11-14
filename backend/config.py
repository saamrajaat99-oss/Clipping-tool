import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

# Storage folders
STORAGE_DIR = BASE_DIR / "storage"
ORIGINAL_VIDEOS_DIR = STORAGE_DIR / "OriginalVideos"
PROCESSED_VIDEOS_DIR = STORAGE_DIR / "ProcessedVideos"
GENERATED_CLIPS_DIR = STORAGE_DIR / "GeneratedClips"
THUMBNAILS_DIR = STORAGE_DIR / "Thumbnails"
SUBTITLES_DIR = STORAGE_DIR / "Subtitles"
EXPORTS_DIR = STORAGE_DIR / "Exports"
LOGS_DIR = STORAGE_DIR / "Logs"

DATA_DIR = BASE_DIR / "data"
DB_PATH = DATA_DIR / "clipper.db"

# Create all necessary directories
for folder in [
    STORAGE_DIR,
    ORIGINAL_VIDEOS_DIR,
    PROCESSED_VIDEOS_DIR,
    GENERATED_CLIPS_DIR,
    THUMBNAILS_DIR,
    SUBTITLES_DIR,
    EXPORTS_DIR,
    LOGS_DIR,
    DATA_DIR
]:
    folder.mkdir(parents=True, exist_ok=True)

# Secret encryption key for API tokens (Fernet 32-byte url-safe base64)
SECRET_KEY_FILE = DATA_DIR / ".secret_key"
if not SECRET_KEY_FILE.exists():
    import secrets
    import base64
    random_key = base64.urlsafe_b64encode(secrets.token_bytes(32)).decode()
    SECRET_KEY_FILE.write_text(random_key)
SECRET_KEY = SECRET_KEY_FILE.read_text().strip()

# Default Settings
DEFAULT_SETTINGS = {
    "nvenc_enabled": True,
    "gpu_device": "0",  # RTX 4060
    "whisper_model": "base",  # tiny, base, small, medium
    "default_aspect_ratio": "9:16",
    "caption_style": "hormozi_yellow",
    "auto_cleanup_raw": False,
    "max_concurrent_tasks": 2,
    "gemini_api_key": os.getenv("GEMINI_API_KEY", ""),
    "openai_api_key": os.getenv("OPENAI_API_KEY", "")
}
