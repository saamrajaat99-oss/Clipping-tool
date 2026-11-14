from fastapi import APIRouter
from backend.database import get_db_connection
from backend.engine.storage_manager import get_storage_stats

router = APIRouter(prefix="/api/analytics", tags=["analytics"])

@router.get("/overview")
def get_overview_metrics():
    """Returns top-level dashboard metrics and KPIs."""
    conn = get_db_connection()

    total_videos = conn.execute("SELECT COUNT(*) FROM videos").fetchone()[0]
    total_clips = conn.execute("SELECT COUNT(*) FROM clips").fetchone()[0]
    currently_processing = conn.execute("SELECT COUNT(*) FROM tasks WHERE status IN ('downloading', 'processing', 'analyzing', 'generating')").fetchone()[0]
    ready_to_publish = conn.execute("SELECT COUNT(*) FROM clips WHERE status = 'ready'").fetchone()[0]
    scheduled_posts = conn.execute("SELECT COUNT(*) FROM clips WHERE status = 'scheduled'").fetchone()[0]
    
    published_success = conn.execute("SELECT COUNT(*) FROM publishing_history WHERE status = 'published'").fetchone()[0]
    published_failed = conn.execute("SELECT COUNT(*) FROM publishing_history WHERE status = 'failed'").fetchone()[0]
    
    # Calculate publishing success rate
    total_pub_attempts = published_success + published_failed
    pub_success_rate = round((published_success / total_pub_attempts * 100), 1) if total_pub_attempts > 0 else 100.0

    # Source platform breakdown
    source_stats = conn.execute("""
    SELECT platform, COUNT(*) as count 
    FROM videos 
    GROUP BY platform 
    ORDER BY count DESC
    """).fetchall()

    # Destination platform breakdown
    platform_stats = conn.execute("""
    SELECT platform, COUNT(*) as count 
    FROM publishing_history 
    GROUP BY platform 
    ORDER BY count DESC
    """).fetchall()

    # Recent activity
    recent_tasks = conn.execute("""
    SELECT t.*, v.title as video_title 
    FROM tasks t 
    LEFT JOIN videos v ON t.video_id = v.id 
    ORDER BY t.created_at DESC 
    LIMIT 5
    """).fetchall()

    conn.close()

    storage_stats = get_storage_stats()

    return {
        "metrics": {
            "total_videos": total_videos,
            "total_clips": total_clips,
            "currently_processing": currently_processing,
            "ready_to_publish": ready_to_publish,
            "scheduled_posts": scheduled_posts,
            "published_success": published_success,
            "published_failed": published_failed,
            "success_rate": pub_success_rate
        },
        "source_distribution": [dict(s) for s in source_stats],
        "platform_distribution": [dict(p) for p in platform_stats],
        "recent_tasks": [dict(r) for r in recent_tasks],
        "storage": storage_stats
    }
