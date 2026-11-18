import os
import re
import math
import logging
import subprocess
from pathlib import Path
from typing import Dict, Any, List, Optional

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

VALID_TRANSITIONS = {
    "fade", "slideup", "slidedown", "wipeleft", "wiperight",
    "circleopen", "fadeblack", "dissolve", "circleclose", "pixelize"
}

def format_ass_time(seconds: float) -> str:
    seconds = max(0.0, seconds)
    h = int(seconds // 3600)
    m = int((seconds % 3600) // 60)
    s = int(seconds % 60)
    cs = int(round((seconds - int(seconds)) * 100))
    if cs >= 100:
        s += 1
        cs = 0
    return f"{h}:{m:02d}:{s:02d}.{cs:02d}"

def generate_ass_subtitles(
    transcript: str,
    start_offset: float,
    duration: float,
    output_ass_path: str,
    style_name: str = "hormozi_yellow",
    words: Optional[List[Dict[str, Any]]] = None
) -> str:
    """
    Creates an ASS subtitle file with word-by-word highlight.
    If real word timestamps are available from Whisper, uses exact timings.
    """
    style = CAPTION_STYLES.get(style_name, CAPTION_STYLES["hormozi_yellow"])

    ass_header = f"""[Script Info]
Title: AutoClip AI Subtitles
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

    events = []

    # If exact word timestamps from Whisper are provided, use real timings
    if words and len(words) > 0:
        words_per_group = 4
        for i in range(0, len(words), words_per_group):
            chunk = words[i:i + words_per_group]
            if not chunk:
                continue
            w_start_raw = chunk[0].get("start", 0.0)
            w_end_raw = chunk[-1].get("end", w_start_raw + 2.0)
            
            # Relative to this clip's timeline
            rel_start = max(0.0, w_start_raw - start_offset)
            rel_end = min(duration, w_end_raw - start_offset)
            if rel_end <= rel_start:
                rel_end = rel_start + 1.2
            
            group_dur = rel_end - rel_start
            w_dur_cs = int((group_dur / len(chunk)) * 100)
            karaoke_text = "".join([f"{{\\k{w_dur_cs}}}{item.get('word', '').strip()} " for item in chunk])
            upper_text = karaoke_text.upper()
            
            event_line = f"Dialogue: 0,{format_ass_time(rel_start)},{format_ass_time(rel_end)},Default,,0,0,0,,{upper_text.strip()}"
            events.append(event_line)
    else:
        # Fallback to proportional spacing across transcript
        raw_words = transcript.strip().split() if transcript else ["Watch", "This", "Moment!"]
        words_per_group = 4
        groups = [raw_words[i:i + words_per_group] for i in range(0, len(raw_words), words_per_group)]
        group_dur = duration / max(len(groups), 1)

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

def generate_multi_clip_subtitles(
    clips_data: List[Dict[str, Any]],
    output_ass_path: str,
    transition_duration: float = 0.5,
    style_name: str = "hormozi_yellow"
) -> str:
    """
    Creates continuous ASS subtitles for a stitched compilation video.
    Aligns each clip's dialogue with its position in the combined timeline.
    """
    style = CAPTION_STYLES.get(style_name, CAPTION_STYLES["hormozi_yellow"])

    ass_header = f"""[Script Info]
Title: AutoClip AI Compilation Subtitles
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

    events = []
    current_timeline_offset = 0.0

    for idx, c in enumerate(clips_data):
        c_dur = float(c.get("duration", 10.0))
        transcript = c.get("transcript") or c.get("title", "")
        raw_words = transcript.strip().split() if transcript else ["Highlight", "Moment!"]
        
        words_per_group = 4
        groups = [raw_words[i:i + words_per_group] for i in range(0, len(raw_words), words_per_group)]
        group_dur = c_dur / max(len(groups), 1)

        t_cursor = current_timeline_offset
        for group in groups:
            g_end = min(t_cursor + group_dur, current_timeline_offset + c_dur)
            start_str = format_ass_time(t_cursor)
            end_str = format_ass_time(g_end)
            
            w_dur_cs = int((group_dur / len(group)) * 100)
            karaoke_text = "".join([f"{{\\k{w_dur_cs}}}{w} " for w in group])
            upper_text = karaoke_text.upper()
            
            events.append(f"Dialogue: 0,{start_str},{end_str},Default,,0,0,0,,{upper_text.strip()}")
            t_cursor = g_end

        # Advance timeline taking transition overlap into account
        current_timeline_offset += (c_dur - transition_duration)

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
    words: Optional[List[Dict[str, Any]]] = None,
    watermark_text: str = "",
    use_nvenc: bool = True
) -> Dict[str, Any]:
    """
    Renders an individual clip using FFmpeg with blurred background letterbox.
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
        style_name=caption_style,
        words=words
    )

    clean_sub_path = ass_subtitle_path.replace("\\", "/").replace(":", "\\:")

    if aspect_ratio == "9:16":
        filter_with_subs = (
            "[0:v]split=2[bg][fg];"
            "[bg]scale=180:320:force_original_aspect_ratio=increase,crop=180:320,boxblur=5:1,scale=1080:1920:flags=fast_bilinear[blurred];"
            "[fg]scale=1080:-1:force_original_aspect_ratio=decrease[sharp];"
            "[blurred][sharp]overlay=(W-w)/2:(H-h)/2[merged];"
            f"[merged]subtitles='{clean_sub_path}'[outv]"
        )
        filter_without_subs = (
            "[0:v]split=2[bg][fg];"
            "[bg]scale=180:320:force_original_aspect_ratio=increase,crop=180:320,boxblur=5:1,scale=1080:1920:flags=fast_bilinear[blurred];"
            "[fg]scale=1080:-1:force_original_aspect_ratio=decrease[sharp];"
            "[blurred][sharp]overlay=(W-w)/2:(H-h)/2[outv]"
        )
    elif aspect_ratio == "1:1":
        filter_with_subs = (
            "[0:v]split=2[bg][fg];"
            "[bg]scale=180:180:force_original_aspect_ratio=increase,crop=180:180,boxblur=5:1,scale=1080:1080:flags=fast_bilinear[blurred];"
            "[fg]scale=1080:-1:force_original_aspect_ratio=decrease[sharp];"
            "[blurred][sharp]overlay=(W-w)/2:(H-h)/2[merged];"
            f"[merged]subtitles='{clean_sub_path}'[outv]"
        )
        filter_without_subs = (
            "[0:v]split=2[bg][fg];"
            "[bg]scale=180:180:force_original_aspect_ratio=increase,crop=180:180,boxblur=5:1,scale=1080:1080:flags=fast_bilinear[blurred];"
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

    active_encoder_args = get_video_encoder_args(use_nvenc=use_nvenc)

    def execute_ffmpeg(f_graph, enc_args):
        c = [
            ffmpeg_cmd,
            "-y",
            "-ss", str(start_time),
            "-i", source_video_path,
            "-t", str(duration),
            "-filter_complex", f_graph,
            "-map", "[outv]",
            "-map", "0:a?",
            *enc_args,
            "-c:a", "aac",
            "-b:a", "192k",
            "-ar", "44100",
            "-threads", "0",
            "-movflags", "+faststart",
            output_video_path
        ]
        return subprocess.run(c, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, timeout=240)

    res = execute_ffmpeg(filter_with_subs, active_encoder_args)
    if res.returncode != 0:
        logger.warning(f"Render Attempt 1 failed. Trying CPU fallback: {res.stderr[:200]}")
        cpu_args = ["-c:v", "libx264", "-preset", "veryfast", "-crf", "22"]
        res = execute_ffmpeg(filter_with_subs, cpu_args)

    if res.returncode != 0:
        logger.warning(f"Render Attempt 2 failed. Rendering without subtitles: {res.stderr[:200]}")
        cpu_args = ["-c:v", "libx264", "-preset", "veryfast", "-crf", "22"]
        res = execute_ffmpeg(filter_without_subs, cpu_args)

    if res.returncode != 0:
        return {"success": False, "error": res.stderr}

    # Generate thumbnail
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

def render_compilation_short(
    clip_items: Optional[List[Dict[str, Any]]] = None,
    compilation_id: str = "",
    aspect_ratio: str = "9:16",
    transition_type: str = "fade",
    transition_duration: float = 0.5,
    caption_style: str = "hormozi_yellow",
    use_nvenc: bool = True,
    clips_to_stitch: Optional[List[Dict[str, Any]]] = None
) -> Dict[str, Any]:
    """
    Attaches 4 to 5 clips together with cinematic transitions (fade, slideup, wipeleft, etc.)
    and burns synchronized animated captions across the entire stitched short video!
    """
    items = clips_to_stitch if clips_to_stitch is not None else (clip_items or [])
    if not items or len(items) < 2:
        return {"success": False, "error": "Need at least 2 clips to create a compilation video."}

    try:
        transition_duration = float(transition_duration)
    except (ValueError, TypeError):
        transition_duration = 0.5

    if transition_type not in VALID_TRANSITIONS:
        transition_type = "fade"

    hw = get_hardware_info()
    ffmpeg_cmd = hw["ffmpeg_path"]
    
    # 1. Normalize each segment into identical 1080x1920 (or target) temp files
    temp_segment_files = []
    durations = []

    try:
        for idx, clip in enumerate(items):
            seg_file = str(GENERATED_CLIPS_DIR / f"temp_{compilation_id}_seg_{idx}.mp4")
            src_path = clip.get("source_path") or clip.get("video_path")
            s_time = float(clip.get("start_time", 0))
            e_time = float(clip.get("end_time", s_time + float(clip.get("duration", 10))))
            dur = max(2.0, e_time - s_time)
            durations.append(dur)

            # Reframe to 9:16 vertical blurred background letterbox
            if aspect_ratio == "9:16":
                norm_filter = (
                    "[0:v]split=2[bg][fg];"
                    "[bg]scale=180:320:force_original_aspect_ratio=increase,crop=180:320,boxblur=5:1,scale=1080:1920:flags=fast_bilinear[blurred];"
                    "[fg]scale=1080:-1:force_original_aspect_ratio=decrease[sharp];"
                    "[blurred][sharp]overlay=(W-w)/2:(H-h)/2,fps=30,format=yuv420p[outv]"
                )
            elif aspect_ratio == "1:1":
                norm_filter = (
                    "[0:v]split=2[bg][fg];"
                    "[bg]scale=180:180:force_original_aspect_ratio=increase,crop=180:180,boxblur=5:1,scale=1080:1080:flags=fast_bilinear[blurred];"
                    "[fg]scale=1080:-1:force_original_aspect_ratio=decrease[sharp];"
                    "[blurred][sharp]overlay=(W-w)/2:(H-h)/2,fps=30,format=yuv420p[outv]"
                )
            else:
                norm_filter = "[0:v]scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,fps=30,format=yuv420p[outv]"

            norm_cmd = [
                ffmpeg_cmd,
                "-y",
                "-ss", str(s_time),
                "-i", src_path,
                "-t", str(dur),
                "-filter_complex", norm_filter,
                "-map", "[outv]",
                "-map", "0:a?",
                "-c:v", "libx264",
                "-preset", "ultrafast",
                "-threads", "0",
                "-c:a", "aac",
                "-ar", "44100",
                "-ac", "2",
                seg_file
            ]
            res_norm = subprocess.run(norm_cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, timeout=90)
            if res_norm.returncode != 0 or not os.path.exists(seg_file):
                logger.error(f"Failed to normalize clip segment {idx}: {res_norm.stderr}")
                return {"success": False, "error": f"Failed normalizing clip segment {idx}: {res_norm.stderr[:200]}"}
            
            temp_segment_files.append(seg_file)

        # 2. Build multi-clip transition filter graph with xfade & acrossfade
        num_segments = len(temp_segment_files)
        total_duration = sum(durations) - ((num_segments - 1) * transition_duration)

        # Generate continuous ASS subtitles covering all segments
        ass_sub_path = str(SUBTITLES_DIR / f"{compilation_id}.ass")
        generate_multi_clip_subtitles(
            clips_data=items,
            output_ass_path=ass_sub_path,
            transition_duration=transition_duration,
            style_name=caption_style
        )
        clean_sub_path = ass_sub_path.replace("\\", "/").replace(":", "\\:")

        v_chain = []
        a_chain = []
        cur_offset = 0.0
        prev_v = "0:v"
        prev_a = "0:a"

        for i in range(1, num_segments):
            cur_offset += (durations[i-1] - transition_duration)
            next_v = f"v{i}" if i < num_segments - 1 else "stitched_v"
            next_a = f"a{i}" if i < num_segments - 1 else "stitched_a"
            
            v_chain.append(
                f"[{prev_v}][{i}:v]xfade=transition={transition_type}:duration={transition_duration}:offset={cur_offset:.2f}[{next_v}]"
            )
            a_chain.append(
                f"[{prev_a}][{i}:a]acrossfade=d={transition_duration}[{next_a}]"
            )
            prev_v = next_v
            prev_a = next_a

        full_filter_with_subs = ";".join(v_chain + a_chain) + f";[stitched_v]subtitles='{clean_sub_path}'[outv]"
        full_filter_no_subs = ";".join(v_chain + a_chain) + ";[stitched_v]null[outv]"

        output_video_path = str(GENERATED_CLIPS_DIR / f"{compilation_id}.mp4")
        thumbnail_path = str(THUMBNAILS_DIR / f"{compilation_id}.jpg")

        # Prepare inputs
        inputs = []
        for sf in temp_segment_files:
            inputs.extend(["-i", sf])

        active_encoder_args = get_video_encoder_args(use_nvenc=use_nvenc)

        stitch_cmd = [
            ffmpeg_cmd,
            "-y",
            *inputs,
            "-filter_complex", full_filter_with_subs,
            "-map", "[outv]",
            "-map", "[stitched_a]",
            *active_encoder_args,
            "-c:a", "aac",
            "-b:a", "192k",
            "-ar", "44100",
            "-movflags", "+faststart",
            output_video_path
        ]

        logger.info(f"Stitching {num_segments} clips with '{transition_type}' transition...")
        res_stitch = subprocess.run(stitch_cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, timeout=240)

        # Fallback if subtitle filter fails
        if res_stitch.returncode != 0:
            logger.warning(f"Stitch with subtitles failed. Trying without subtitle filter: {res_stitch.stderr[:250]}")
            fallback_stitch_cmd = [
                ffmpeg_cmd,
                "-y",
                *inputs,
                "-filter_complex", full_filter_no_subs,
                "-map", "[outv]",
                "-map", "[stitched_a]",
                "-c:v", "libx264",
                "-preset", "veryfast",
                "-crf", "22",
                "-c:a", "aac",
                "-b:a", "192k",
                output_video_path
            ]
            res_fb = subprocess.run(fallback_stitch_cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, timeout=180)
            if res_fb.returncode != 0:
                return {"success": False, "error": res_fb.stderr}

        # Generate thumbnail
        thumb_cmd = [
            ffmpeg_cmd,
            "-y",
            "-ss", "1.5",
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
            "subtitle_path": ass_sub_path,
            "duration": round(total_duration, 2),
            "clip_count": num_segments
        }

    finally:
        # Clean up temporary segments
        for f in temp_segment_files:
            if os.path.exists(f):
                try:
                    os.remove(f)
                except Exception:
                    pass
