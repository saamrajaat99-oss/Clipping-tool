import os
import time
import json
import uuid
import asyncio
import logging
import threading
from datetime import datetime
from typing import Dict, Any, Optional

from backend.database import get_db_connection, get_setting
from backend.engine.importer import download_video, extract_video_metadata, generate_video_thumbnail
from backend.engine.ai_engine import analyze_and_generate_clips
from backend.engine.video_renderer import render_clip
from backend.engine.publisher import publish_clip_to_platform
from backend.engine.storage_manager import cleanup_raw_video

logger = logging.getLogger("queue_manager")

class QueueWorker:
    def __init__(self):
        self.is_running = False
        self.is_paused = False
        self._thread = None
        self._listeners = []

    def register_listener(self, callback):
        self._listeners.append(callback)

    def notify(self, event_type: str, data: dict):
        for cb in self._listeners:
            try:
                cb(event_type, data)
            except Exception:
                pass

    def start(self):
        if not self.is_running:
            self.is_running = True
            # Perform laptop restart recovery
            self.recover_interrupted_tasks()
            self._thread = threading.Thread(target=self._run_loop, daemon=True)
            self._thread.start()
            logger.info("Persistent Queue Worker started.")

    def pause(self):
        self.is_paused = True
        logger.info("Persistent Queue paused.")

    def resume(self):
        self.is_paused = False
        logger.info("Persistent Queue resumed.")

    def recover_interrupted_tasks(self):
        """
        Scans database on startup for tasks that were in progress when
        the application or laptop was shut down, and resets them to 'pending' to retry safely.
        """
        conn = get_db_connection()
        stuck_tasks = conn.execute(
            "SELECT id, video_id, task_type FROM tasks WHERE status IN ('downloading', 'processing', 'analyzing', 'generating')"
        ).fetchall()
        
        for t in stuck_tasks:
            logger.info(f"Recovering interrupted task {t['id']} after system restart...")
            conn.execute(
                "UPDATE tasks SET status = 'pending', status_message = 'Recovered after restart. Ready to resume.', progress = 0 WHERE id = ?",
                (t['id'],)
            )
        conn.commit()
        conn.close()

    def _run_loop(self):
        while self.is_running:
            if not self.is_paused:
                task = self._get_next_pending_task()
                if task:
                    self._process_task(task)
                else:
                    time.sleep(2)
            else:
                time.sleep(2)

    def _get_next_pending_task(self):
        conn = get_db_connection()
        task = conn.execute(
            "SELECT * FROM tasks WHERE status = 'pending' ORDER BY created_at ASC LIMIT 1"
        ).fetchone()
        conn.close()
        return dict(task) if task else None

    def _update_task(self, task_id: str, status: str, progress: float, message: str, error: str = None):
        conn = get_db_connection()
        conn.execute("""
        UPDATE tasks 
        SET status = ?, progress = ?, status_message = ?, error_message = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
        """, (status, progress, message, error, task_id))
        conn.commit()
        conn.close()
        self.notify("task_update", {
            "task_id": task_id,
            "status": status,
            "progress": progress,
            "message": message,
            "error": error
        })

    def _process_task(self, task: dict):
        task_id = task["id"]
        video_id = task["video_id"]
        clip_config = json.loads(task.get("clip_config") or "{}")

        durations = clip_config.get("clip_durations", [30, 60])
        num_clips = clip_config.get("num_clips_per_video", 3)
        aspect_ratio = clip_config.get("aspect_ratio", "9:16")
        caption_style = clip_config.get("caption_style", "hormozi_yellow")
        auto_publish = clip_config.get("auto_publish", False)
        target_platforms = clip_config.get("target_platforms", ["youtube"])

        conn = get_db_connection()
        video = conn.execute("SELECT * FROM videos WHERE id = ?", (video_id,)).fetchone()
        conn.close()

        if not video:
            self._update_task(task_id, "failed", 0, "Video record missing.", "Video not found.")
            return

        try:
            # 1. Download / Import Stage
            file_path = video["file_path"]
            if not file_path or not os.path.exists(file_path):
                self._update_task(task_id, "downloading", 10, f"Downloading video from {video['platform']}...")
                
                def download_progress(pct, speed, eta):
                    self._update_task(task_id, "downloading", 10 + (pct * 0.3), f"Downloading ({speed}, ETA {eta})...")

                dl_res = download_video(video["source_url"], video_id, progress_callback=download_progress)
                if not dl_res.get("success"):
                    self._update_task(task_id, "failed", 0, "Download failed.", dl_res.get("error"))
                    return

                file_path = dl_res["file_path"]
                thumb_path = dl_res.get("thumbnail_path", "")

                conn = get_db_connection()
                conn.execute("""
                UPDATE videos 
                SET file_path = ?, thumbnail_path = ?, duration = ?, resolution = ?, fps = ?, status = 'imported'
                WHERE id = ?
                """, (file_path, thumb_path, dl_res.get("duration", 0), dl_res.get("resolution", "1080p"), dl_res.get("fps", 30), video_id))
                conn.commit()
                conn.close()

            # 2. AI Analysis & Highlight Detection Stage
            self._update_task(task_id, "analyzing", 45, "AI analyzing speech, hooks, audio energy, and scenes...")
            clips_metadata = analyze_and_generate_clips(
                video_path=file_path,
                target_durations=durations,
                max_clips=num_clips,
                custom_aspect_ratio=aspect_ratio,
                custom_caption_style=caption_style
            )

            # 3. Clip Generation / Rendering Stage
            self._update_task(task_id, "generating", 65, f"Rendering {len(clips_metadata)} AI clips with RTX 4060 hardware acceleration...")
            
            created_clip_ids = []
            conn = get_db_connection()
            for idx, c_meta in enumerate(clips_metadata):
                clip_id = str(uuid.uuid4())
                sub_progress = 65 + ((idx + 1) / len(clips_metadata) * 30)
                self._update_task(task_id, "generating", sub_progress, f"Rendering clip #{idx+1} of {len(clips_metadata)} ({c_meta['duration']}s)...")

                render_res = render_clip(
                    source_video_path=file_path,
                    clip_id=clip_id,
                    start_time=c_meta["start_time"],
                    end_time=c_meta["end_time"],
                    aspect_ratio=aspect_ratio,
                    caption_style=caption_style,
                    transcript=c_meta["transcript"],
                    use_nvenc=get_setting("nvenc_enabled", True)
                )

                if render_res.get("success"):
                    conn.execute("""
                    INSERT INTO clips (
                        id, video_id, title, description, hashtags, start_time, end_time, duration,
                        aspect_ratio, virality_score, hook_score, caption_style, video_path, thumbnail_path,
                        subtitle_path, status
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ready')
                    """, (
                        clip_id, video_id, c_meta["title"], c_meta["description"], c_meta["hashtags"],
                        c_meta["start_time"], c_meta["end_time"], c_meta["duration"], aspect_ratio,
                        c_meta["virality_score"], c_meta["hook_score"], caption_style,
                        render_res["video_path"], render_res["thumbnail_path"], render_res["subtitle_path"]
                    ))
                    created_clip_ids.append(clip_id)

            conn.commit()
            conn.close()

            # 4. Auto-publish if requested
            if auto_publish and created_clip_ids:
                self._update_task(task_id, "processing", 98, "Scheduling & publishing clips to selected platforms...")
                for cid in created_clip_ids:
                    for p in target_platforms:
                        publish_clip_to_platform(cid, p)

            # Check raw file cleanup policy
            if get_setting("auto_cleanup_raw", False):
                cleanup_raw_video(file_path)

            self._update_task(task_id, "completed", 100, f"Successfully created {len(created_clip_ids)} short clips!")
            logger.info(f"Task {task_id} completed successfully.")

        except Exception as e:
            logger.error(f"Error in task {task_id}: {e}", exc_info=True)
            self._update_task(task_id, "failed", 0, f"Processing error: {str(e)}", str(e))

# Global Worker Instance
queue_worker = QueueWorker()
