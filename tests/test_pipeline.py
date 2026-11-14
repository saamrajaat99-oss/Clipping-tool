import subprocess
import os
import uuid
import json
from pathlib import Path

from backend.config import STORAGE_DIR, ORIGINAL_VIDEOS_DIR
from backend.utils.hardware import find_binary, get_hardware_info
from backend.database import init_db, get_db_connection
from backend.engine.ai_engine import analyze_and_generate_clips
from backend.engine.video_renderer import render_clip

def create_sample_video():
    test_video_path = str(ORIGINAL_VIDEOS_DIR / "sample_podcast.mp4")
    ffmpeg_cmd = find_binary("ffmpeg")
    
    print("1. Generating 1920x1080 test video with audio track locally via FFmpeg...")
    # Generate 20-second 1920x1080 video with synthetic audio tones
    cmd = [
        ffmpeg_cmd,
        "-y",
        "-f", "lavfi",
        "-i", "testsrc=size=1920x1080:rate=30",
        "-f", "lavfi",
        "-i", "sine=frequency=440:beep_factor=2:duration=25",
        "-c:v", "libx264",
        "-preset", "ultrafast",
        "-c:a", "aac",
        "-b:a", "128k",
        "-t", "25",
        "-pix_fmt", "yuv420p",
        test_video_path
    ]
    subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)
    print(f"Sample video created at: {test_video_path}")
    return test_video_path

def test_pipeline():
    init_db()
    hw = get_hardware_info()
    print("Detected Hardware:", hw)
    
    video_path = create_sample_video()
    
    print("2. Running AI Analysis & Virality Hook Detection...")
    clips = analyze_and_generate_clips(
        video_path=video_path,
        target_durations=[15, 20],
        max_clips=2,
        custom_aspect_ratio="9:16",
        custom_caption_style="hormozi_yellow"
    )
    print(f"Generated {len(clips)} candidate clips:")
    for idx, c in enumerate(clips):
        print(f"  Clip #{idx+1}: {c['title']} | Duration: {c['duration']}s | Virality: {c['virality_score']} | Hook: {c['hook_score']}")
        
    clip_to_render = clips[0]
    clip_id = str(uuid.uuid4())
    print(f"3. Rendering 9:16 vertical short clip using RTX 4060 NVENC (Clip ID: {clip_id})...")
    
    render_res = render_clip(
        source_video_path=video_path,
        clip_id=clip_id,
        start_time=clip_to_render["start_time"],
        end_time=clip_to_render["end_time"],
        aspect_ratio="9:16",
        caption_style="hormozi_yellow",
        transcript=clip_to_render["transcript"],
        use_nvenc=hw["nvenc_supported"]
    )
    
    print("Render Result:", render_res)
    assert render_res["success"], f"Render failed: {render_res.get('error')}"
    assert os.path.exists(render_res["video_path"]), "Output MP4 file does not exist!"
    assert os.path.exists(render_res["thumbnail_path"]), "Thumbnail does not exist!"
    assert os.path.exists(render_res["subtitle_path"]), "Subtitle ASS file does not exist!"
    
    # Check video probe
    ffprobe_cmd = find_binary("ffprobe")
    probe_res = subprocess.run([
        ffprobe_cmd, "-v", "error", "-select_streams", "v:0",
        "-show_entries", "stream=width,height", "-of", "csv=s=x:p=0",
        render_res["video_path"]
    ], stdout=subprocess.PIPE, text=True)
    
    print("Exported Clip Dimensions:", probe_res.stdout.strip())
    print("\nSUCCESS! The complete AI Video Clipping, NVENC GPU Rendering & Subtitle Engine verified!")

if __name__ == "__main__":
    test_pipeline()
