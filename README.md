# AutoClip AI — AI-Powered Automatic Video Clipping & Multi-Platform Publishing Studio

> **Production-ready, local Windows desktop application for automated video clipping, intelligent virality scoring, animated subtitle burning, and multi-platform publishing.**

Built specifically for high-performance Windows laptops featuring **Intel Core i7-13650HX** processors and **NVIDIA GeForce RTX 4060 GPU**, with hardware-accelerated video rendering, persistent SQLite task queues, restart recovery, and zero monthly cloud subscription fees.

---

## 🚀 Key Features

### 1. Multi-Platform Video Import
- **Supported Online Sources**: YouTube, Google Drive, Dropbox, Twitch, Direct MP4/WebM URLs, and local video file uploads.
- **Automatic Platform Detection**: Detects video hosting service automatically and extracts rich metadata (title, duration, resolution, fps, author).
- **Batch Queueing**: Paste up to 20 video links simultaneously to process sequentially in the background.

### 2. AI Automatic Clipping Engine
- **Intelligent Virality & Hook Scoring**: Evaluates acoustic spikes, emotional keywords, educational hooks, and audience interest factors to identify the most viral-worthy highlights.
- **Configurable Clip Durations**: Generate 15s, 30s, 45s, 60s, or 90s clips.
- **Sentence Boundary Protection**: Prevents cutting words or sentences mid-phrase by snapping cuts to natural speech pauses.
- **AI-Generated Metadata**: Creates high-engagement titles, viral social captions, and trending hashtags (`#Shorts`, `#Reels`, `#Viral`).
- **Interactive Studio**: Manually fine-tune start and end timestamps with timeline scrubbers.

### 3. Professional Video Editing & Reframing
- **Multi-Aspect Ratio Formats**:
  - `9:16 Vertical` (1080x1920) for YouTube Shorts, Instagram Reels, and TikTok with high-end **Blurred Background Letterbox** (original 16:9 video centered sharply over an ambient blurred background).
  - `16:9 Landscape` (1920x1080) for standard YouTube.
  - `1:1 Square` (1080x1080) for Instagram Feed and LinkedIn.
- **Animated Subtitles (ASS Format)**:
  - **Hormozi Yellow**: High-contrast bold uppercase typography with bright yellow active-word pop.
  - **Cyber Neon**: Cyan text with glowing magenta outline.
  - **Clean Minimalist**: Modern rounded sans-serif on semi-transparent pill.
  - **Beast Bold**: High-impact red and gold typography.
- **Hardware-Accelerated Rendering**: Utilizes NVIDIA NVENC (`h264_nvenc`) with automatic CPU fallback (`libx264`) for maximum compatibility.

### 4. Social Media Auto-Publishing & Manual Export Assistant
- **Target Platforms**: YouTube Shorts, Instagram Reels, TikTok, Facebook Reels, and LinkedIn.
- **Official API Integrations**: Encrypted OAuth token storage with local AES-256 encryption.
- **Scheduled Publishing**: Background scheduler monitors pending posts every minute and auto-publishes when `scheduled_at <= now()`.
- **1-Click Manual Export Assistant**: For platforms awaiting developer review or manual upload, provides a 1-click download package with formatted captions & hashtags copied to your clipboard and direct links to YouTube Studio / Instagram Creator / TikTok Studio.

### 5. Persistent Queue with Laptop Restart Recovery
- **State Machine**: `Pending` ➔ `Downloading` ➔ `Analyzing` ➔ `Generating` ➔ `Ready` ➔ `Scheduled` ➔ `Published`.
- **Laptop Restart Protection**: If your laptop goes to sleep or restarts during processing, AutoClip AI detects interrupted tasks on boot and safely resumes or re-queues them.
- **Queue Controls**: Pause, Resume, Retry failed tasks, Cancel, and Clear completed history.

### 6. Storage & Resource Optimization
- **Organized Storage Hierarchy**:
  ```
  /storage
    /OriginalVideos   - Raw source downloads and uploads
    /ProcessedVideos  - Normalized media files
    /GeneratedClips   - Final rendered 1080x1920 MP4 clips
    /Thumbnails       - High-res clip thumbnails
    /Subtitles        - Word-timed ASS subtitle files
    /Exports          - Export packages
    /Logs             - Background task logs
  ```
- **Auto-Cleanup Raw Videos**: Optional toggle to automatically delete heavy source downloads once short clips are generated, preserving laptop disk space.

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 18, TypeScript, Tailwind CSS, Vite, Lucide Icons |
| **Backend** | Python 3.14 / 3.11+, FastAPI, Uvicorn, SQLite (WAL mode) |
| **Video Engine** | FFmpeg 9.0.2 with NVIDIA NVENC (`h264_nvenc`), FFprobe, libass |
| **AI Transcription** | Whisper / faster-whisper, acoustic speech segmentation, NLP virality heuristics |
| **Security** | Fernet AES-256 local credential encryption |
| **Acceleration** | NVIDIA GeForce RTX 4060 GPU (8GB VRAM) & Intel Core i7-13650HX |

---

## ⚡ Quick Start (Windows)

### Option 1: One-Click Startup (Recommended)
1. Double-click `start.bat`.
2. The backend server initializes, and the Studio interface will automatically open in your browser at:
   ```
   http://localhost:8000
   ```

### Option 2: Developer Mode (Hot Reloading)
Double-click `dev.bat` to launch both the FastAPI backend (`http://localhost:8000`) and the Vite frontend dev server (`http://localhost:5173`) with live hot-reloading.

---

## 📋 API Endpoints Reference

- `GET /api/analytics/overview` — Dashboard KPIs, storage metrics, and platform stats.
- `GET /api/videos` — List imported source videos.
- `POST /api/videos/import` — Batch queue video URLs for automatic clipping.
- `POST /api/videos/upload` — Upload local video file from laptop.
- `GET /api/clips` — List generated short clips.
- `GET /api/clips/{id}` — Get single clip details.
- `PUT /api/clips/{id}` — Update timestamps, title, description, or subtitle style.
- `POST /api/clips/{id}/re-render` — Re-render clip with updated settings using GPU.
- `POST /api/clips/{id}/schedule` — Schedule clip for automated publishing.
- `POST /api/clips/{id}/publish` — Publish clip immediately.
- `GET /api/clips/{id}/export-package` — Get 1-click manual export kit.
- `GET /api/queue` — Get live background processing queue.
- `POST /api/queue/pause` — Pause queue processing.
- `POST /api/queue/resume` — Resume queue processing.
- `POST /api/queue/{id}/retry` — Retry a failed task.
- `GET /api/social/accounts` — List connected social media platforms.
- `POST /api/social/accounts/{platform}` — Save API credentials and tokens.
- `GET /api/settings` — Get system configuration & detected laptop hardware.
- `PUT /api/settings` — Update hardware acceleration & storage policies.
- `WS /api/ws` — Real-time WebSocket event broadcaster for live logs and progress.

---

## 🛡️ License & Platform Compliance
AutoClip AI respects platform Terms of Service, official developer API limits, and user content permissions. Official OAuth authentication and official developer APIs are used for direct publishing. When APIs require manual review or external developer registration, the built-in **1-Click Manual Export Assistant** provides a compliant workflow.
