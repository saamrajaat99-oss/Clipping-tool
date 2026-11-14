import os
import uuid
import json
import shutil
from pathlib import Path
from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from typing import List

from backend.database import get_db_connection
from backend.models import VideoImportRequest
from backend.config import ORIGINAL_VIDEOS_DIR, THUMBNAILS_DIR
from backend.engine.importer import detect_platform, extract_video_metadata, generate_video_thumbnail
from backend.engine.storage_manager import delete_clip_files, cleanup_raw_video

router = APIRouter(prefix="/api/videos", tags=["videos"])

@router.get("")
def list_videos():
    """List all videos with their clip counts."""
    conn = get_db_connection()
    videos = conn.execute("""
    SELECT v.*, COUNT(c.id) as clips_count 
    FROM videos v 
    LEFT JOIN clips c ON v.id = c.video_id 
    GROUP BY v.id 
    ORDER BY v.created_at DESC
    """).fetchall()
    conn.close()
    return [dict(v) for v in videos]

@router.get("/{video_id}")
def get_video(video_id: str):
    """Get single video metadata and associated clips."""
    conn = get_db_connection()
    video = conn.execute("SELECT * FROM videos WHERE id = ?", (video_id,)).fetchone()
    if not video:
        conn.close()
        raise HTTPException(status_code=404, detail="Video not found")
    clips = conn.execute("SELECT * FROM clips WHERE video_id = ? ORDER BY start_time ASC", (video_id,)).fetchall()
    conn.close()
    res = dict(video)
    res["clips"] = [dict(c) for c in clips]
    return res

@router.post("/import")
def import_videos(req: VideoImportRequest):
    """
    Queue multiple video links for automatic download, AI clipping, and optional publishing.
    """
    if not req.urls:
        raise HTTPException(status_code=400, detail="No URLs provided")

    conn = get_db_connection()
    created_tasks = []

    for url in req.urls:
        url = url.strip()
        if not url:
            continue
        
        video_id = str(uuid.uuid4())
        task_id = str(uuid.uuid4())
        platform = detect_platform(url)

        # Quick metadata fetch
        meta = extract_video_metadata(url)
        title = meta.get("title", f"Video from {platform.capitalize()}")
        duration = meta.get("duration", 0)
        resolution = meta.get("resolution", "1080p")
        fps = meta.get("fps", 30)

        conn.execute("""
        INSERT INTO videos (id, title, source_url, platform, duration, resolution, fps, status, metadata_json)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?)
        """, (video_id, title, url, platform, duration, resolution, fps, json.dumps(meta)))

        clip_config = {
            "clip_durations": req.clip_durations,
            "num_clips_per_video": req.num_clips_per_video,
            "aspect_ratio": req.aspect_ratio,
            "caption_style": req.caption_style,
            "auto_publish": req.auto_publish,
            "target_platforms": req.target_platforms
        }

        conn.execute("""
        INSERT INTO tasks (id, video_id, task_type, status, progress, status_message, clip_config)
        VALUES (?, ?, 'full_pipeline', 'pending', 0, 'Queued for processing', ?)
        """, (task_id, video_id, json.dumps(clip_config)))

        created_tasks.append({
            "task_id": task_id,
            "video_id": video_id,
            "title": title,
            "platform": platform
        })

    conn.commit()
    conn.close()
    return {"success": True, "queued_count": len(created_tasks), "tasks": created_tasks}

@router.post("/upload")
async def upload_video(
    file: UploadFile = File(...),
    clip_durations: str = Form("30,60"),
    num_clips: int = Form(3),
    aspect_ratio: str = Form("9:16"),
    caption_style: str = Form("hormozi_yellow")
):
    """Handles local video file upload from user's laptop."""
    video_id = str(uuid.uuid4())
    task_id = str(uuid.uuid4())
    ext = Path(file.filename).suffix or ".mp4"
    dest_path = ORIGINAL_VIDEOS_DIR / f"{video_id}{ext}"

    with open(dest_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # Extract metadata using local probe
    meta = extract_video_metadata(str(dest_path))
    thumb_path = generate_video_thumbnail(str(dest_path), video_id)

    conn = get_db_connection()
    conn.execute("""
    INSERT INTO videos (id, title, source_url, platform, duration, resolution, fps, file_path, thumbnail_path, status, metadata_json)
    VALUES (?, ?, ?, 'local', ?, ?, ?, ?, ?, 'imported', ?)
    """, (
        video_id,
        Path(file.filename).stem,
        file.filename,
        meta.get("duration", 0),
        meta.get("resolution", "1080p"),
        meta.get("fps", 30),
        str(dest_path),
        thumb_path,
        json.dumps(meta)
    ))

    try:
        dur_list = [int(x.strip()) for x in clip_durations.split(",") if x.strip()]
    except Exception:
        dur_list = [30, 60]

    clip_config = {
        "clip_durations": dur_list,
        "num_clips_per_video": num_clips,
        "aspect_ratio": aspect_ratio,
        "caption_style": caption_style,
        "auto_publish": False,
        "target_platforms": ["youtube"]
    }

    conn.execute("""
    INSERT INTO tasks (id, video_id, task_type, status, progress, status_message, clip_config)
    VALUES (?, ?, 'full_pipeline', 'pending', 0, 'Queued for processing', ?)
    """, (task_id, video_id, json.dumps(clip_config)))

    conn.commit()
    conn.close()

    return {
        "success": True,
        "video_id": video_id,
        "task_id": task_id,
        "title": Path(file.filename).stem
    }

@router.delete("/{video_id}")
def delete_video(video_id: str):
    """Deletes a video and its generated clips, subtitles, and thumbnails."""
    conn = get_db_connection()
    video = conn.execute("SELECT * FROM videos WHERE id = ?", (video_id,)).fetchone()
    if not video:
        conn.close()
        raise HTTPException(status_code=404, detail="Video not found")

    # Delete physical files
    if video["file_path"] and os.path.exists(video["file_path"]):
        cleanup_raw_video(video["file_path"])
    if video["thumbnail_path"] and os.path.exists(video["thumbnail_path"]):
        try:
            os.remove(video["thumbnail_path"])
        except Exception:
            pass

    # Delete clips files
    clips = conn.execute("SELECT video_path, thumbnail_path, subtitle_path FROM clips WHERE video_id = ?", (video_id,)).fetchall()
    for c in clips:
        delete_clip_files(c["video_path"], c["thumbnail_path"], c["subtitle_path"])

    conn.execute("DELETE FROM videos WHERE id = ?", (video_id,))
    conn.commit()
    conn.close()
    return {"success": True, "message": "Video and all associated clips removed."}
