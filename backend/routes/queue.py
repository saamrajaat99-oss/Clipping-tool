import json
from fastapi import APIRouter, HTTPException
from backend.database import get_db_connection
from backend.engine.queue_manager import queue_worker

router = APIRouter(prefix="/api/queue", tags=["queue"])

@router.get("")
def get_queue():
    """Returns list of tasks in the processing queue."""
    conn = get_db_connection()
    tasks = conn.execute("""
    SELECT t.*, v.title as video_title, v.source_url, v.platform
    FROM tasks t
    LEFT JOIN videos v ON t.video_id = v.id
    ORDER BY t.created_at DESC
    """).fetchall()
    conn.close()

    return {
        "is_paused": queue_worker.is_paused,
        "is_running": queue_worker.is_running,
        "tasks": [dict(t) for t in tasks]
    }

@router.post("/pause")
def pause_queue():
    """Pauses background queue execution."""
    queue_worker.pause()
    return {"success": True, "is_paused": True, "message": "Queue paused."}

@router.post("/resume")
def resume_queue():
    """Resumes background queue execution."""
    queue_worker.resume()
    return {"success": True, "is_paused": False, "message": "Queue resumed."}

@router.post("/{task_id}/retry")
def retry_task(task_id: str):
    """Resets a failed or cancelled task to pending."""
    conn = get_db_connection()
    task = conn.execute("SELECT * FROM tasks WHERE id = ?", (task_id,)).fetchone()
    if not task:
        conn.close()
        raise HTTPException(status_code=404, detail="Task not found")

    conn.execute("""
    UPDATE tasks 
    SET status = 'pending', progress = 0, status_message = 'Queued for retry', error_message = NULL, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
    """, (task_id,))
    conn.commit()
    conn.close()
    return {"success": True, "message": f"Task {task_id} re-queued."}

@router.post("/{task_id}/cancel")
def cancel_task(task_id: str):
    """Cancels a pending or processing task."""
    conn = get_db_connection()
    task = conn.execute("SELECT * FROM tasks WHERE id = ?", (task_id,)).fetchone()
    if not task:
        conn.close()
        raise HTTPException(status_code=404, detail="Task not found")

    conn.execute("""
    UPDATE tasks 
    SET status = 'cancelled', status_message = 'Cancelled by user', updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
    """, (task_id,))
    conn.commit()
    conn.close()
    return {"success": True, "message": f"Task {task_id} cancelled."}

@router.delete("/clear-completed")
def clear_completed():
    """Removes completed and cancelled tasks from queue history."""
    conn = get_db_connection()
    conn.execute("DELETE FROM tasks WHERE status IN ('completed', 'cancelled')")
    conn.commit()
    conn.close()
    return {"success": True, "message": "Queue history cleared."}
