import os
import json
import logging
from fastapi import APIRouter, HTTPException
from typing import Optional, List

from backend.database import get_db_connection, get_setting
from backend.models import ClipUpdateRequest, ClipScheduleRequest, ManualPublishRequest
from backend.engine.video_renderer import render_clip
from backend.engine.publisher import publish_clip_to_platform, PLATFORM_PORTALS
from backend.engine.storage_manager import delete_clip_files

logger = logging.getLogger("clips_route")

router = APIRouter(prefix="/api/clips", tags=["clips"])

@router.get("")
def list_clips(video_id: Optional[str] = None, status: Optional[str] = None):
    """List all generated clips."""
    conn = get_db_connection()
    query = """
    SELECT c.*, v.title as video_title, v.source_url, v.platform as source_platform
    FROM clips c
    JOIN videos v ON c.video_id = v.id
    WHERE 1=1
    """
    params = []
    if video_id:
        query += " AND c.video_id = ?"
        params.append(video_id)
    if status:
        query += " AND c.status = ?"
        params.append(status)

    query += " ORDER BY c.created_at DESC"
    clips = conn.execute(query, params).fetchall()
    conn.close()
    return [dict(c) for c in clips]

@router.get("/{clip_id}")
def get_clip(clip_id: str):
    """Get single clip details."""
    conn = get_db_connection()
    clip = conn.execute("""
    SELECT c.*, v.title as video_title, v.file_path as source_file_path, v.source_url, v.platform as source_platform
    FROM clips c
    JOIN videos v ON c.video_id = v.id
    WHERE c.id = ?
    """, (clip_id,)).fetchone()
    conn.close()
    if not clip:
        raise HTTPException(status_code=404, detail="Clip not found")
    return dict(clip)

@router.put("/{clip_id}")
def update_clip(clip_id: str, req: ClipUpdateRequest):
    """Update title, description, hashtags, timestamps, or styles for a clip."""
    conn = get_db_connection()
    clip = conn.execute("SELECT * FROM clips WHERE id = ?", (clip_id,)).fetchone()
    if not clip:
        conn.close()
        raise HTTPException(status_code=404, detail="Clip not found")

    title = req.title if req.title is not None else clip["title"]
    description = req.description if req.description is not None else clip["description"]
    hashtags = req.hashtags if req.hashtags is not None else clip["hashtags"]
    start_time = req.start_time if req.start_time is not None else clip["start_time"]
    end_time = req.end_time if req.end_time is not None else clip["end_time"]
    aspect_ratio = req.aspect_ratio if req.aspect_ratio is not None else clip["aspect_ratio"]
    caption_style = req.caption_style if req.caption_style is not None else clip["caption_style"]
    duration = end_time - start_time

    conn.execute("""
    UPDATE clips
    SET title = ?, description = ?, hashtags = ?, start_time = ?, end_time = ?, duration = ?,
        aspect_ratio = ?, caption_style = ?
    WHERE id = ?
    """, (title, description, hashtags, start_time, end_time, duration, aspect_ratio, caption_style, clip_id))
    conn.commit()
    conn.close()

    return {"success": True, "message": "Clip metadata updated successfully."}

@router.post("/{clip_id}/re-render")
def rerender_clip(clip_id: str):
    """Re-renders the clip with currently saved timestamps and caption style."""
    conn = get_db_connection()
    clip = conn.execute("""
    SELECT c.*, v.file_path as source_path 
    FROM clips c 
    JOIN videos v ON c.video_id = v.id 
    WHERE c.id = ?
    """, (clip_id,)).fetchone()
    conn.close()

    if not clip:
        raise HTTPException(status_code=404, detail="Clip not found")
    if not clip["source_path"] or not os.path.exists(clip["source_path"]):
        raise HTTPException(status_code=400, detail="Original source video is no longer available on disk.")

    res = render_clip(
        source_video_path=clip["source_path"],
        clip_id=clip_id,
        start_time=clip["start_time"],
        end_time=clip["end_time"],
        aspect_ratio=clip["aspect_ratio"],
        caption_style=clip["caption_style"],
        transcript=clip["title"],
        use_nvenc=get_setting("nvenc_enabled", True)
    )

    if not res.get("success"):
        raise HTTPException(status_code=500, detail=f"Re-render failed: {res.get('error')}")

    return {"success": True, "message": "Clip re-rendered successfully!", "details": res}

@router.post("/{clip_id}/schedule")
def schedule_clip(clip_id: str, req: ClipScheduleRequest):
    """Schedules a clip for future publishing."""
    conn = get_db_connection()
    clip = conn.execute("SELECT * FROM clips WHERE id = ?", (clip_id,)).fetchone()
    if not clip:
        conn.close()
        raise HTTPException(status_code=404, detail="Clip not found")

    conn.execute("""
    UPDATE clips SET status = 'scheduled', scheduled_at = ? WHERE id = ?
    """, (req.scheduled_at, clip_id))
    conn.commit()
    conn.close()

    return {
        "success": True,
        "message": f"Clip scheduled for {req.scheduled_at} on {', '.join(req.platforms)}"
    }

@router.post("/{clip_id}/publish")
def publish_clip(clip_id: str, req: ManualPublishRequest):
    """Triggers instant publishing or export for a clip."""
    results = []
    for p in req.platforms:
        res = publish_clip_to_platform(clip_id, p)
        results.append(res)
    return {"success": True, "results": results}

@router.get("/{clip_id}/export-package")
def get_export_package(clip_id: str):
    """
    Returns complete manual export kit: direct video URL, thumbnail URL,
    formatted platform-tailored caption & hashtags, and platform studio links.
    """
    conn = get_db_connection()
    clip = conn.execute("SELECT * FROM clips WHERE id = ?", (clip_id,)).fetchone()
    conn.close()

    if not clip:
        raise HTTPException(status_code=404, detail="Clip not found")

    return {
        "clip_id": clip_id,
        "title": clip["title"],
        "description": clip["description"],
        "hashtags": clip["hashtags"],
        "caption_full": f"{clip['title']}\n\n{clip['description']}\n\n{clip['hashtags']}",
        "video_filename": os.path.basename(clip["video_path"]) if clip["video_path"] else "",
        "download_url": f"/storage/GeneratedClips/{os.path.basename(clip['video_path'])}" if clip["video_path"] else "",
        "thumbnail_url": f"/storage/Thumbnails/{os.path.basename(clip['thumbnail_path'])}" if clip["thumbnail_path"] else "",
        "platform_portals": PLATFORM_PORTALS
    }

@router.delete("/{clip_id}")
def delete_clip(clip_id: str):
    """Deletes clip record and associated files from disk."""
    conn = get_db_connection()
    clip = conn.execute("SELECT * FROM clips WHERE id = ?", (clip_id,)).fetchone()
    if not clip:
        conn.close()
        raise HTTPException(status_code=404, detail="Clip not found")

    delete_clip_files(clip["video_path"], clip["thumbnail_path"], clip["subtitle_path"])
    conn.execute("DELETE FROM clips WHERE id = ?", (clip_id,))
    conn.commit()
    conn.close()
    return {"success": True, "message": "Clip deleted."}
