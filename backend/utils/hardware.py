import os
import glob
import shutil
import subprocess
import logging
from pathlib import Path

logger = logging.getLogger("hardware")

def find_binary(binary_name: str) -> str:
    """Finds binary via shutil.which or known Windows install locations."""
    found = shutil.which(binary_name)
    if found:
        return found
    
    # Check known winget Gyan.FFmpeg package location
    local_app_data = os.getenv("LOCALAPPDATA", "")
    if local_app_data:
        winget_pattern = os.path.join(
            local_app_data,
            "Microsoft", "WinGet", "Packages",
            "Gyan.FFmpeg*", "*", "bin", f"{binary_name}.exe"
        )
        matches = glob.glob(winget_pattern)
        if matches and os.path.exists(matches[0]):
            return matches[0]

        direct_pattern = os.path.join(
            local_app_data,
            "Microsoft", "WinGet", "Packages",
            "Gyan.FFmpeg*", "bin", f"{binary_name}.exe"
        )
        matches2 = glob.glob(direct_pattern)
        if matches2 and os.path.exists(matches2[0]):
            return matches2[0]

    return binary_name

def get_hardware_info():
    """Detects CPU, RAM, NVIDIA GPU, and FFmpeg NVENC support."""
    ffmpeg_exe = find_binary("ffmpeg")
    ffprobe_exe = find_binary("ffprobe")

    info = {
        "has_nvidia_gpu": False,
        "gpu_name": "None",
        "gpu_memory_total_mb": 0,
        "nvenc_supported": False,
        "ffmpeg_path": ffmpeg_exe,
        "ffprobe_path": ffprobe_exe
    }

    # Detect NVIDIA GPU via nvidia-smi
    try:
        res = subprocess.run(
            ["nvidia-smi", "--query-gpu=name,memory.total", "--format=csv,noheader,nounits"],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            timeout=5
        )
        if res.returncode == 0 and res.stdout.strip():
            lines = res.stdout.strip().split("\n")
            parts = lines[0].split(",")
            info["has_nvidia_gpu"] = True
            info["gpu_name"] = parts[0].strip()
            if len(parts) > 1:
                try:
                    info["gpu_memory_total_mb"] = int(float(parts[1].strip()))
                except ValueError:
                    pass
    except Exception as e:
        logger.warning(f"Failed to query nvidia-smi: {e}")

    # Detect if FFmpeg genuinely supports h264_nvenc on current driver
    try:
        # Run a 1-frame dry run test to verify NVENC API compatibility with driver
        test_cmd = [
            ffmpeg_exe,
            "-y",
            "-f", "lavfi",
            "-i", "color=s=64x64:d=0.04",
            "-c:v", "h264_nvenc",
            "-f", "null",
            "-"
        ]
        test_res = subprocess.run(test_cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, timeout=5)
        if test_res.returncode == 0:
            info["nvenc_supported"] = True
        else:
            logger.info("NVENC driver API version mismatch or unavailable; falling back to CPU encoder.")
            info["nvenc_supported"] = False
    except Exception as e:
        logger.warning(f"Failed to check FFmpeg NVENC encoder: {e}")
        info["nvenc_supported"] = False

    return info

def get_video_encoder_args(use_nvenc: bool = True):
    """
    Returns optimal FFmpeg video encoder arguments.
    Uses h264_nvenc for RTX 4060 when supported, or falls back to libx264.
    """
    hw = get_hardware_info()
    if use_nvenc and hw["nvenc_supported"]:
        return [
            "-c:v", "h264_nvenc",
            "-preset", "p5",       # High quality NVENC preset
            "-tune", "hq",
            "-rc", "vbr",
            "-cq", "22",
            "-b:v", "0",
            "-spatial-aq", "1"
        ]
    else:
        return [
            "-c:v", "libx264",
            "-preset", "veryfast",
            "-tune", "fastdecode",
            "-threads", "0",
            "-crf", "22"
        ]
