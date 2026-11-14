@echo off
setlocal enabledelayedexpansion

echo =====================================================================
echo  AI Auto Video Clipper & Multi-Platform Publisher - Setup Wizard
echo =====================================================================
echo.

:: Add Node and FFmpeg to current session path if present
set "PATH=C:\Program Files\nodejs;C:\Users\%USERNAME%\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-9.0.2-full_build\bin;%PATH%"

:: 1. Check Python
echo [1/4] Checking Python installation...
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python is not found in PATH!
    echo Please install Python 3.11+ and ensure 'Add to PATH' is checked.
    pause
    exit /b 1
)
python --version

:: 2. Check Node.js
echo.
echo [2/4] Checking Node.js and npm...
node -v >nul 2>&1
if %errorlevel% neq 0 (
    echo [WARNING] Node.js not detected in global path, trying standard install path...
)

:: 3. Install Python Dependencies
echo.
echo [3/4] Installing Python core dependencies...
python -m pip install -r requirements.txt
if %errorlevel% neq 0 (
    echo [ERROR] Failed to install Python dependencies.
    pause
    exit /b 1
)

:: 4. Install & Build Frontend
echo.
echo [4/4] Installing frontend dependencies & building production UI...
cd frontend
call npm.cmd install
if %errorlevel% neq 0 (
    echo [ERROR] npm install failed.
    cd ..
    pause
    exit /b 1
)
call npm.cmd run build
cd ..

echo.
echo =====================================================================
echo  Installation Completed Successfully!
echo  Double-click 'start.bat' to launch the Studio on your laptop.
echo =====================================================================
echo.
pause
