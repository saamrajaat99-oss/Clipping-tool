import os
import re
import math
import logging
import subprocess
from pathlib import Path
from typing import Dict, Any, List

from backend.config import GENERATED_CLIPS_DIR, THUMBNAILS_DIR, SUBTITLES_DIR
from backend.utils.hardware import get_hardware_info, get_video_encoder_args

logger = logging.getLogger("video_renderer")

CAPTION_STYLES = {
    "hormozi_yellow": {
        "fontname": "Arial",
        "fontsize": 22,
        "primary_colour": "&H00FFFFFF",     # White
        "secondary_colour": "&H0000FFFF",   # Bright Yellow for highlight
        "outline_colour": "&H00000000",     # Black
        "back_colour": "&H80000000",
        "bold": 1,
        "italic": 0,
        "border_style": 1,
        "outline": 3,
        "shadow": 1,
        "alignment": 2,                     # Bottom center
        "margin_v": 70
    },
    "cyber_neon": {
        "fontname": "Arial",
        "fontsize": 24,
        "primary_colour": "&H00FFFF00",     # Cyan
        "secondary_colour": "&H00FF00FF",   # Magenta
        "outline_colour": "&H00330033",     # Deep purple
        "back_colour": "&H00000000",
        "bold": 1,
        "italic": 0,
        "border_style": 1,
        "outline": 4,
        "shadow": 2,
        "alignment": 2,
        "margin_v": 80
    },
    "clean_minimal": {
        "fontname": "Arial",
        "fontsize": 18,
        "primary_colour": "&H00FFFFFF",
        "secondary_colour": "&H00E0E0E0",
        "outline_colour": "&H001A1A1A",
        "back_colour": "&H90000000",
        "bold": 0,
        "italic": 0,
        "border_style": 3,                 # Opaque box
        "outline": 1,
        "shadow": 0,
        "alignment": 2,
        "margin_v": 60
    },
    "beast_bold": {
        "fontname": "Arial",
        "fontsize": 26,
        "primary_colour": "&H0000FFFF",     # Vivid Yellow
        "secondary_colour": "&H000000FF",   # Bright Red
        "outline_colour": "&H00000000",
        "back_colour": "&H00000000",
        "bold": 1,
        "italic": 0,
        "border_style": 1,
        "outline": 4,
        "shadow": 2,
        "alignment": 2,
        "margin_v": 85
    }
}

def generate_ass_subtitles(
    transcript: str,
    start_offset: float,
    duration: float,
    output_ass_path: str,
    style_name: str = "hormozi_yellow"
) -> str:
    """
    Creates an ASS subtitle file with word-by-word highlight.
    """
    style = CAPTION_STYLES.get(style_name, CAPTION_STYLES["hormozi_yellow"])
    words = transcript.strip().split() if transcript else ["Watch", "This", "Moment!"]
    total_words = len(words)
    
    words_per_group = 4
    groups = [words[i:i + words_per_group] for i in range(0, total_words, words_per_group)]
    group_dur = duration / max(len(groups), 1)

    ass_header = f"""[Script Info]
Title: AI Auto Clipper Subtitles
ScriptType: v4.00+
WrapStyle: 0
ScaledBorderAndShadow: yes
YCbCr Matrix: TV.601
PlayResX: 1080
PlayResY: 1920

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,{style['fontname']},{style['fontsize'] * 2},{style['primary_colour']},{style['secondary_colour']},{style['outline_colour']},{style['back_colour']},{style['bold']},{style['italic']},0,0,100,100,0,0,{style['border_style']},{style['outline'] * 2},{style['shadow'] * 2},{style['alignment']},40,40,{style['margin_v'] * 2},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""

    def format_ass_time(seconds: float) -> str:
        h = int(seconds // 3600)
        m = int((seconds % 3600) // 60)
        s = int(seconds % 60)
        cs = int(round((seconds - int(seconds)) * 100))
        return f"{h}:{m:02d}:{s:02d}.{cs:02d}"

    events = []
    current_time = 0.0

    for group in groups:
        g_end = min(current_time + group_dur, duration)
        start_str = format_ass_time(current_time)
        end_str = format_ass_time(g_end)
        
        w_dur_cs = int((group_dur / len(group)) * 100)
        karaoke_text = "".join([f"{{\\k{w_dur_cs}}}{w} " for w in group])
        upper_text = karaoke_text.upper()
        
        event_line = f"Dialogue: 0,{start_str},{end_str},Default,,0,0,0,,{upper_text.strip()}"
        events.append(event_line)
        current_time = g_end

    full_ass_content = ass_header + "\n".join(events) + "\n"
    with open(output_ass_path, "w", encoding="utf-8") as f:
        f.write(full_ass_content)
        
    return output_ass_path

def render_clip(
    source_video_path: str,
    clip_id: str,
    start_time: float,
    end_time: float,
    aspect_ratio: str = "9:16",
    caption_style: str = "hormozi_yellow",
    transcript: str = "",
    watermark_text: str = "",
    use_nvenc: bool = True
) -> Dict[str, Any]:
    """
    Renders short clip using FFmpeg.
    Automatically uses NVENC if compatible, or gracefully falls back to libx264.
    """
    hw = get_hardware_info()
    ffmpeg_cmd = hw["ffmpeg_path"]
    duration = end_time - start_time
    if duration <= 0:
        duration = 30.0

    output_video_path = str(GENERATED_CLIPS_DIR / f"{clip_id}.mp4")
    thumbnail_path = str(THUMBNAILS_DIR / f"{clip_id}.jpg")
    ass_subtitle_path = str(SUBTITLES_DIR / f"{clip_id}.ass")

    generate_ass_subtitles(
        transcript=transcript,
        start_offset=start_time,
        duration=duration,
        output_ass_path=ass_subtitle_path,
        style_name=caption_style
    )

    # Clean escaped path for Windows FFmpeg subtitles filter
    # e.g. C\:/path/to/sub.ass
    clean_sub_path = ass_subtitle_path.replace("\\", "/").replace(":", "\\:")

    # Build filter graphs
    if aspect_ratio == "9:16":
        filter_with_subs = (
            "[0:v]split=2[bg][fg];"
            "[bg]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur=20:5[blurred];"
            "[fg]scale=1080:-1:force_original_aspect_ratio=decrease[sharp];"
            "[blurred][sharp]overlay=(W-w)/2:(H-h)/2[merged];"
            f"[merged]subtitles='{clean_sub_path}'[outv]"
        )
        filter_without_subs = (
            "[0:v]split=2[bg][fg];"
            "[bg]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur=20:5[blurred];"
            "[fg]scale=1080:-1:force_original_aspect_ratio=decrease[sharp];"
            "[blurred][sharp]overlay=(W-w)/2:(H-h)/2[outv]"
        )
    elif aspect_ratio == "1:1":
        filter_with_subs = (
            "[0:v]split=2[bg][fg];"
            "[bg]scale=1080:1080:force_original_aspect_ratio=increase,crop=1080:1080,boxblur=15:5[blurred];"
            "[fg]scale=1080:-1:force_original_aspect_ratio=decrease[sharp];"
            "[blurred][sharp]overlay=(W-w)/2:(H-h)/2[merged];"
            f"[merged]subtitles='{clean_sub_path}'[outv]"
        )
        filter_without_subs = (
            "[0:v]split=2[bg][fg];"
            "[bg]scale=1080:1080:force_original_aspect_ratio=increase,crop=1080:1080,boxblur=15:5[blurred];"
            "[fg]scale=1080:-1:force_original_aspect_ratio=decrease[sharp];"
            "[blurred][sharp]overlay=(W-w)/2:(H-h)/2[outv]"
        )
    else:
        filter_with_subs = (
            "[0:v]scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2[scaled];"
            f"[scaled]subtitles='{clean_sub_path}'[outv]"
        )
        filter_without_subs = (
            "[0:v]scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2[outv]"
        )

    # Encoder settings: try NVENC if enabled & supported, otherwise libx264
    active_encoder_args = get_video_encoder_args(use_nvenc=use_nvenc)

    def execute_ffmpeg(f_graph, enc_args):
        c = [
            ffmpeg_cmd,
            "-y",
            "-ss", str(start_time),
            "-t", str(duration),
            "-i", source_video_path,
            "-filter_complex", f_graph,
            "-map", "[outv]",
            "-map", "0:a?",
            *enc_args,
            "-c:a", "aac",
            "-b:a", "192k",
            "-ar", "44100",
            "-movflags", "+faststart",
            output_video_path
        ]
        return subprocess.run(c, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, timeout=180)

    # Attempt 1: With Subtitles + Active Encoder
    res = execute_ffmpeg(filter_with_subs, active_encoder_args)

    # Attempt 2: If failed, try with libx264 (CPU fallback)
    if res.returncode != 0:
        logger.warning(f"Render Attempt 1 failed. Trying CPU fallback with libx264: {res.stderr[:200]}")
        cpu_args = ["-c:v", "libx264", "-preset", "veryfast", "-crf", "22"]
        res = execute_ffmpeg(filter_with_subs, cpu_args)

    # Attempt 3: If font/subtitle filter still failed, render without subtitles filter
    if res.returncode != 0:
        logger.warning(f"Render Attempt 2 failed. Rendering without subtitles overlay: {res.stderr[:200]}")
        cpu_args = ["-c:v", "libx264", "-preset", "veryfast", "-crf", "22"]
        res = execute_ffmpeg(filter_without_subs, cpu_args)

    if res.returncode != 0:
        return {"success": False, "error": res.stderr}

    # Generate clip thumbnail
    thumb_cmd = [
        ffmpeg_cmd,
        "-y",
        "-ss", str(min(1.5, duration * 0.2)),
        "-i", output_video_path,
        "-vframes", "1",
        "-q:v", "2",
        thumbnail_path
    ]
    subprocess.run(thumb_cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=10)

    return {
        "success": True,
        "video_path": output_video_path,
        "thumbnail_path": thumbnail_path,
        "subtitle_path": ass_subtitle_path,
        "duration": duration
    }
