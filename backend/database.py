import sqlite3
import json
import logging
from datetime import datetime
from backend.config import DB_PATH, DEFAULT_SETTINGS

logger = logging.getLogger("database")

def get_db_connection():
    """Returns a SQLite connection with Row factory and WAL mode enabled."""
    conn = sqlite3.connect(str(DB_PATH), check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL;")
    conn.execute("PRAGMA synchronous=NORMAL;")
    conn.execute("PRAGMA foreign_keys=ON;")
    return conn

def init_db():
    """Initializes tables and default records."""
    conn = get_db_connection()
    cursor = conn.cursor()

    # Videos Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS videos (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        source_url TEXT,
        platform TEXT NOT NULL,
        duration REAL DEFAULT 0,
        resolution TEXT,
        fps REAL DEFAULT 30,
        file_path TEXT,
        thumbnail_path TEXT,
        status TEXT DEFAULT 'pending',
        metadata_json TEXT,
        transcript_json TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)

    # Tasks Queue Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        video_id TEXT,
        task_type TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        progress REAL DEFAULT 0,
        status_message TEXT,
        error_message TEXT,
        clip_config TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (video_id) REFERENCES videos (id) ON DELETE CASCADE
    );
    """)

    # Generated Clips Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS clips (
        id TEXT PRIMARY KEY,
        video_id TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        hashtags TEXT,
        start_time REAL NOT NULL,
        end_time REAL NOT NULL,
        duration REAL NOT NULL,
        aspect_ratio TEXT DEFAULT '9:16',
        virality_score INTEGER DEFAULT 80,
        hook_score INTEGER DEFAULT 80,
        caption_style TEXT DEFAULT 'hormozi_yellow',
        video_path TEXT,
        thumbnail_path TEXT,
        subtitle_path TEXT,
        status TEXT DEFAULT 'generated',
        scheduled_at TIMESTAMP,
        published_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (video_id) REFERENCES videos (id) ON DELETE CASCADE
    );
    """)

    # Social Media Accounts Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS social_accounts (
        id TEXT PRIMARY KEY,
        platform TEXT NOT NULL UNIQUE,
        account_name TEXT,
        account_handle TEXT,
        avatar_url TEXT,
        access_token_enc TEXT,
        refresh_token_enc TEXT,
        client_id TEXT,
        client_secret_enc TEXT,
        expires_at TIMESTAMP,
        is_connected INTEGER DEFAULT 0,
        settings_json TEXT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)

    # Publishing History Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS publishing_history (
        id TEXT PRIMARY KEY,
        clip_id TEXT,
        platform TEXT NOT NULL,
        account_name TEXT,
        status TEXT NOT NULL,
        post_url TEXT,
        error_message TEXT,
        attempts INTEGER DEFAULT 1,
        published_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (clip_id) REFERENCES clips (id) ON DELETE SET NULL
    );
    """)

    # Application Settings Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS app_settings (
        key TEXT PRIMARY KEY,
        value TEXT
    );
    """)

    # Seed default social platforms if not present
    platforms = [
        ("youtube", "YouTube Shorts"),
        ("instagram", "Instagram Reels"),
        ("tiktok", "TikTok"),
        ("facebook", "Facebook Reels"),
        ("linkedin", "LinkedIn")
    ]
    for p_id, p_name in platforms:
        cursor.execute("SELECT id FROM social_accounts WHERE platform = ?", (p_id,))
        if not cursor.fetchone():
            import uuid
            cursor.execute("""
            INSERT INTO social_accounts (id, platform, account_name, is_connected)
            VALUES (?, ?, ?, 0)
            """, (str(uuid.uuid4()), p_id, p_name))

    # Seed default settings
    for key, val in DEFAULT_SETTINGS.items():
        cursor.execute("SELECT key FROM app_settings WHERE key = ?", (key,))
        if not cursor.fetchone():
            cursor.execute("INSERT INTO app_settings (key, value) VALUES (?, ?)", (key, json.dumps(val)))

    conn.commit()
    conn.close()
    logger.info("Database initialized successfully.")

def get_setting(key: str, default=None):
    """Fetch setting value from database."""
    conn = get_db_connection()
    row = conn.execute("SELECT value FROM app_settings WHERE key = ?", (key,)).fetchone()
    conn.close()
    if row and row["value"]:
        try:
            return json.loads(row["value"])
        except Exception:
            return row["value"]
    return default

def set_setting(key: str, value):
    """Save setting value to database."""
    conn = get_db_connection()
    conn.execute(
        "INSERT INTO app_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
        (key, json.dumps(value))
    )
    conn.commit()
    conn.close()
