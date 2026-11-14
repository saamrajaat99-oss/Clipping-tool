import os
from fastapi import APIRouter
from backend.database import get_db_connection, get_setting, set_setting
from backend.models import SettingsUpdate
from backend.utils.hardware import get_hardware_info
from backend.engine.storage_manager import get_storage_stats

router = APIRouter(prefix="/api/settings", tags=["settings"])

@router.get("")
def get_settings():
    """Returns application settings combined with detected laptop hardware."""
    hw = get_hardware_info()
    storage = get_storage_stats()

    settings_data = {
        "nvenc_enabled": get_setting("nvenc_enabled", True),
        "gpu_device": get_setting("gpu_device", "0"),
        "whisper_model": get_setting("whisper_model", "base"),
        "default_aspect_ratio": get_setting("default_aspect_ratio", "9:16"),
        "caption_style": get_setting("caption_style", "hormozi_yellow"),
        "auto_cleanup_raw": get_setting("auto_cleanup_raw", False),
        "max_concurrent_tasks": get_setting("max_concurrent_tasks", 2),
        "gemini_api_key": "***" if get_setting("gemini_api_key") else "",
        "openai_api_key": "***" if get_setting("openai_api_key") else "",
        "hardware": hw,
        "storage": storage
    }
    return settings_data

@router.put("")
def update_settings(req: SettingsUpdate):
    """Updates settings in the database."""
    if req.nvenc_enabled is not None:
        set_setting("nvenc_enabled", req.nvenc_enabled)
    if req.gpu_device is not None:
        set_setting("gpu_device", req.gpu_device)
    if req.whisper_model is not None:
        set_setting("whisper_model", req.whisper_model)
    if req.default_aspect_ratio is not None:
        set_setting("default_aspect_ratio", req.default_aspect_ratio)
    if req.caption_style is not None:
        set_setting("caption_style", req.caption_style)
    if req.auto_cleanup_raw is not None:
        set_setting("auto_cleanup_raw", req.auto_cleanup_raw)
    if req.max_concurrent_tasks is not None:
        set_setting("max_concurrent_tasks", req.max_concurrent_tasks)
    if req.gemini_api_key is not None and req.gemini_api_key != "***":
        set_setting("gemini_api_key", req.gemini_api_key)
    if req.openai_api_key is not None and req.openai_api_key != "***":
        set_setting("openai_api_key", req.openai_api_key)

    return {"success": True, "message": "Settings saved successfully."}
