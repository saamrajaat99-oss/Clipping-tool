@echo off
setlocal enabledelayedexpansion
title AutoClip AI Studio

:: Ensure working directory is the project directory
cd /d "%~dp0"

echo =====================================================================
echo  AutoClip AI — Studio & Multi-Platform Publisher
echo  Local Laptop Execution (RTX 4060 GPU Acceleration)
echo =====================================================================
echo.

:: 1. Detect Real Python Executable
set "PYTHON_EXE=python"
if exist "%LOCALAPPDATA%\Python\pythoncore-3.14-64\python.exe" (
    set "PYTHON_EXE=%LOCALAPPDATA%\Python\pythoncore-3.14-64\python.exe"
)

:: 2. Add Node and FFmpeg to session PATH
set "PATH=C:\Program Files\nodejs;C:\Users\%USERNAME%\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-9.0.2-full_build\bin;%PATH%"

echo [*] Checking Python runtime...
"%PYTHON_EXE%" --version
if %errorlevel% neq 0 (
    echo [ERROR] Python could not be launched.
    pause
    exit /b 1
)

echo [*] Launching Backend & Persistent Queue Worker on http://0.0.0.0:8000...
start "AutoClip AI Engine" /D "%~dp0" cmd /k ""%PYTHON_EXE%" -m uvicorn backend.main:app --host 0.0.0.0 --port 8000"

echo [*] Waiting for server to initialize...
timeout /t 2 /nobreak >nul

echo [*] Opening AutoClip Studio in default web browser...
start http://localhost:8000

echo.
echo =====================================================================
echo  Studio is running!
echo  Web UI: http://localhost:8000
echo  Alternative URL: http://127.0.0.1:8000
echo  API Documentation: http://localhost:8000/docs
echo.
echo  Keep the "AutoClip AI Engine" window open while using the app.
echo =====================================================================
echo.
