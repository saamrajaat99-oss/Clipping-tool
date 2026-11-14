import os
import asyncio
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from backend.config import STORAGE_DIR, BASE_DIR
from backend.database import init_db
from backend.engine.queue_manager import queue_worker
from backend.engine.publisher import process_scheduled_posts
from backend.routes import videos, clips, queue, social, analytics, settings, websocket

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("app")

# Background scheduler loop for publishing
async def scheduled_publisher_loop():
    while True:
        try:
            process_scheduled_posts()
        except Exception as e:
            logger.error(f"Error in scheduled publisher loop: {e}")
        await asyncio.sleep(60)

def start_8080_redirector():
    """Lightweight fallback redirector so http://localhost:8080 automatically opens the app."""
    import threading
    from http.server import HTTPServer, BaseHTTPRequestHandler
    class RedirectHandler(BaseHTTPRequestHandler):
        def do_GET(self):
            self.send_response(307)
            self.send_header('Location', f'http://localhost:8000{self.path}')
            self.end_headers()
        def log_message(self, format, *args):
            pass
    def _run():
        try:
            server = HTTPServer(('0.0.0.0', 8080), RedirectHandler)
            server.serve_forever()
        except Exception:
            pass
    t = threading.Thread(target=_run, daemon=True)
    t.start()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup:
    logger.info("Initializing database and storage...")
    init_db()
    
    logger.info("Starting background Persistent Queue Worker...")
    queue_worker.start()

    logger.info("Starting port 8080 fallback redirector...")
    start_8080_redirector()

    logger.info("Launching scheduled post monitor...")
    publisher_task = asyncio.create_task(scheduled_publisher_loop())

    yield

    # Shutdown:
    logger.info("Shutting down background workers...")
    queue_worker.is_running = False
    publisher_task.cancel()

app = FastAPI(
    title="AI Auto Video Clipper & Multi-Platform Publisher Studio",
    version="1.0.0",
    lifespan=lifespan
)

# CORS configuration for local React Vite frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(videos.router)
app.include_router(clips.router)
app.include_router(queue.router)
app.include_router(social.router)
app.include_router(analytics.router)
app.include_router(settings.router)
app.include_router(websocket.router)

# Mount /storage directory for direct video streaming and thumbnail display
app.mount("/storage", StaticFiles(directory=str(STORAGE_DIR)), name="storage")

# Serve built frontend if available
FRONTEND_DIST = BASE_DIR / "frontend" / "dist"
if FRONTEND_DIST.exists():
    app.mount("/assets", StaticFiles(directory=str(FRONTEND_DIST / "assets")), name="assets")
    
    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        # Don't intercept API routes or storage
        if full_path.startswith("api/") or full_path.startswith("storage/"):
            return None
        file_path = FRONTEND_DIST / full_path
        if file_path.exists() and file_path.is_file():
            from fastapi.responses import FileResponse
            return FileResponse(file_path)
        from fastapi.responses import FileResponse
        return FileResponse(FRONTEND_DIST / "index.html")
else:
    @app.get("/")
    def root():
        return {
            "status": "online",
            "app": "AI Auto Video Clipper & Multi-Platform Publisher",
            "version": "1.0.0",
            "docs_url": "/docs"
        }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="127.0.0.1", port=8000, reload=True)
