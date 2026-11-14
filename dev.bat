@echo off
setlocal enabledelayedexpansion
title AutoClip AI - Dev Server

set "PATH=C:\Program Files\nodejs;C:\Users\%USERNAME%\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-9.0.2-full_build\bin;%PATH%"

echo Starting Backend in Reload Mode...
start "AutoClip - Backend" cmd /k "python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload"

echo Starting Frontend Vite Dev Server...
start "AutoClip - Vite Frontend" cmd /k "cd frontend && npm.cmd run dev"

timeout /t 3 /nobreak >nul
start http://localhost:5173
